import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Search, Plus, Edit2, Trash2, X, LogOut, Lock, UserPlus, Users, ShieldAlert, ArrowLeft, Download, KeyRound } from 'lucide-react'

// Funções de formatação
const formatMoeda = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '-'
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor)
  if (isNaN(num)) return '-'
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatNumero = (valor, sufixo = '') => {
  if (valor === null || valor === undefined || valor === '') return '-'
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor)
  if (isNaN(num)) return '-'
  return `${num.toLocaleString('pt-BR')}${sufixo}`
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  const [selectedBrand, setSelectedBrand] = useState(null)
  const [activeTab, setActiveTab] = useState('products')

  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [usersList, setUsersList] = useState([])

  const [formData, setFormData] = useState({
    nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '',
    largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: ''
  })

  const parseInputValue = (val) => {
    if (val === null || val === undefined || val === '') return null
    if (typeof val === 'number') return parseFloat(val.toFixed(2))
    let strVal = val.toString().trim()
    if (strVal.includes(',')) {
      strVal = strVal.replace(/\./g, '').replace(',', '.')
    }
    const parsed = parseFloat(strVal)
    if (isNaN(parsed)) return null
    return Math.round(parsed * 100) / 100
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUserProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true)
      }
      if (session) fetchUserProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) return
      if (data) setProfile(data)
      else setProfile({ id: userId, role: 'user', approved: true })
    } catch (err) {
      console.error(err)
    }
  }

  const fetchProducts = async () => {
    if (!selectedBrand) return
    setLoading(true)
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('marca', selectedBrand)
      .order('id', { ascending: true })

    if (!error) setProducts(data || [])
    setLoading(false)
  }

  const fetchAllProducts = async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome', { ascending: true })

    if (!error) setAllProducts(data || [])
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setUsersList(data)
  }

  useEffect(() => {
    if (session && profile?.approved) {
      fetchAllProducts()
      if (selectedBrand) fetchProducts()
      if (profile?.role === 'admin') fetchUsers()
    }
  }, [session, profile, selectedBrand])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthError(error.message)
      else {
        setAuthMessage('Cadastro realizado! Por favor, confirme seu e-mail e aguarde a aprovação do administrador.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError('E-mail ou senha incorretos.')
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })

    if (error) setAuthError('Erro ao enviar e-mail: ' + error.message)
    else setAuthMessage('E-mail enviado! Verifique sua caixa de entrada.')
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setAuthError('Erro ao redefinir: ' + error.message)
    else {
      setAuthMessage('Senha alterada com sucesso!')
      setIsResettingPassword(false)
      setNewPassword('')
    }
  }

  const handleLogout = () => {
    setSelectedBrand(null)
    supabase.auth.signOut()
  }

  const handleExportExcel = async () => {
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    const dataToExport = filteredProducts.map((p) => ({
      'Produto': p.nome || '',
      'À Vista': p.a_vista ?? '',
      'À Prazo': p.a_prazo ?? '',
      'Valor M': p.valor_m ?? '',
      'Valor M²': p.valor_m2 ?? '',
      'Largura (m)': p.largura ? `${p.largura}m` : '',
      'Gramatura (g)': p.gramatura ? `${p.gramatura}g` : '',
      'Rendimento M': p.rendimento_m ? `${p.rendimento_m}m` : '',
      'Rendimento M²': p.rendimento_m2 ? `${p.rendimento_m2}m²` : '',
      'Composição': p.composicao || ''
    }))

    const worksheet = window.XLSX.utils.json_to_sheet(dataToExport)
    const workbook = window.XLSX.utils.book_new()
    window.XLSX.utils.book_append_sheet(workbook, worksheet, selectedBrand?.toUpperCase() || 'Produtos')
    
    const fitToColumn = Object.keys(dataToExport[0] || {}).map((key) => ({ wch: Math.max(key.length + 5, 15) }))
    worksheet['!cols'] = fitToColumn

    const dataHoje = new Date().toISOString().split('T')[0]
    window.XLSX.writeFile(workbook, `Tabela_${selectedBrand?.toUpperCase()}_${dataHoje}.xlsx`)
  }

  const toggleApproval = async (userId, currentStatus) => {
    await supabase.from('profiles').update({ approved: !currentStatus }).eq('id', userId)
    fetchUsers()
  }

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchUsers()
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    const payload = {
      nome: formData.nome,
      marca: selectedBrand,
      a_vista: parseInputValue(formData.a_vista),
      a_prazo: parseInputValue(formData.a_prazo),
      valor_m: parseInputValue(formData.valor_m),
      valor_m2: parseInputValue(formData.valor_m2),
      largura: parseInputValue(formData.largura),
      gramatura: parseInputValue(formData.gramatura),
      rendimento_m: parseInputValue(formData.rendimento_m),
      rendimento_m2: parseInputValue(formData.rendimento_m2),
      composicao: formData.composicao
    }

    if (editingId) {
      await supabase.from('produtos').update(payload).eq('id', editingId)
    } else {
      await supabase.from('produtos').insert([payload])
    }

    closeModal()
    fetchProducts()
    fetchAllProducts()
  }

  const handleDelete = async (id) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      await supabase.from('produtos').delete().eq('id', id)
      fetchProducts()
      fetchAllProducts()
    }
  }

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id)
      setFormData({
        nome: product.nome || '',
        a_vista: product.a_vista !== null && product.a_vista !== undefined ? String(product.a_vista).replace('.', ',') : '',
        a_prazo: product.a_prazo !== null && product.a_prazo !== undefined ? String(product.a_prazo).replace('.', ',') : '',
        valor_m: product.valor_m !== null && product.valor_m !== undefined ? String(product.valor_m).replace('.', ',') : '',
        valor_m2: product.valor_m2 !== null && product.valor_m2 !== undefined ? String(product.valor_m2).replace('.', ',') : '',
        largura: product.largura !== null && product.largura !== undefined ? String(product.largura).replace('.', ',') : '',
        gramatura: product.gramatura !== null && product.gramatura !== undefined ? String(product.gramatura).replace('.', ',') : '',
        rendimento_m: product.rendimento_m !== null && product.rendimento_m !== undefined ? String(product.rendimento_m).replace('.', ',') : '',
        rendimento_m2: product.rendimento_m2 !== null && product.rendimento_m2 !== undefined ? String(product.rendimento_m2).replace('.', ',') : '',
        composicao: product.composicao || ''
      })
    } else {
      setEditingId(null)
      setFormData({ nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '', largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: '' })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  const filteredProducts = products.filter(p =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.composicao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGlobalProducts = allProducts.filter(p =>
    p.nome?.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    p.composicao?.toLowerCase().includes(globalSearchTerm.toLowerCase())
  )

  const isManatex = selectedBrand === 'manatex'
  const brandColor = isManatex ? '#059669' : '#111827'

  // RESET DE SENHA
  if (isResettingPassword) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
        <form onSubmit={handleUpdatePassword} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '360px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', color: '#059669' }}>
            <KeyRound size={40} />
            <h2 style={{ margin: '10px 0 0 0', color: '#1e293b', fontSize: '20px' }}>Criar Nova Senha</h2>
          </div>

          {authError && <p style={{ color: 'red', fontSize: '13px', textAlign: 'center' }}>{authError}</p>}
          {authMessage && <p style={{ color: 'green', fontSize: '13px', textAlign: 'center' }}>{authMessage}</p>}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Nova Senha</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} placeholder="Mínimo 6 caracteres" />
          </div>

          <button type="submit" style={{ width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>
            Salvar Nova Senha
          </button>
        </form>
      </div>
    )
  }

  // LOGIN / REGISTRO
  if (!session) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '360px', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px', color: '#059669' }}>
              <KeyRound size={40} />
              <h2 style={{ margin: '10px 0 0 0', color: '#1e293b', fontSize: '20px' }}>Recuperar Senha</h2>
            </div>

            {authError && <p style={{ color: 'red', fontSize: '13px', textAlign: 'center' }}>{authError}</p>}
            {authMessage && <p style={{ color: 'green', fontSize: '13px', textAlign: 'center' }}>{authMessage}</p>}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Seu E-mail registrado</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} placeholder="exemplo@email.com" />
            </div>

            <button type="submit" style={{ width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>
              Enviar E-mail de Recuperação
            </button>

            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => { setIsForgotPassword(false); setAuthError(''); setAuthMessage(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
                Voltar para o Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAuth} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '360px', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px', color: '#059669' }}>
              {isSignUp ? <UserPlus size={40} /> : <Lock size={40} />}
              <h2 style={{ margin: '10px 0 0 0', color: '#1e293b', fontSize: '20px' }}>{isSignUp ? 'Criar Conta' : 'Catálogo de Preços'}</h2>
            </div>

            {authError && <p style={{ color: 'red', fontSize: '13px', textAlign: 'center' }}>{authError}</p>}
            {authMessage && <p style={{ color: 'green', fontSize: '13px', textAlign: 'center' }}>{authMessage}</p>}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} placeholder="Mínimo 6 caracteres" />
            </div>

            {!isSignUp && (
              <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                <button type="button" onClick={() => { setIsForgotPassword(true); setAuthError(''); setAuthMessage(''); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>
                  Esqueceu sua senha?
                </button>
              </div>
            )}

            <button type="submit" style={{ width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>
              {isSignUp ? 'Cadastrar' : 'Entrar'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); setAuthMessage(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
                {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se aqui'}
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  // AGUARDANDO APROVAÇÃO
  if (profile && !profile.approved) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', textAlign: 'center', maxWidth: '400px', width: '100%', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
          <ShieldAlert size={50} color="#eab308" style={{ marginBottom: '10px' }} />
          <h2 style={{ color: '#1e293b', margin: '0 0 10px 0', fontSize: '20px' }}>Aguardando Autorização</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
            Sua conta foi confirmada, porém precisa ser <strong>aprovada por um administrador</strong> antes de liberar o acesso aos preços.
          </p>
          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px' }}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  // SELEÇÃO DE MARCA / BUSCA GLOBAL
  if (!selectedBrand && activeTab !== 'users') {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
        <header style={{ width: '100%', maxWidth: '900px', backgroundColor: '#059669', color: 'white', padding: '15px', borderRadius: '10px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '20px', boxSizing: 'border-box' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px' }}>Catálogo Geral</h1>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              Nível: <strong>{profile?.role === 'admin' ? 'Administrador' : 'Usuário'}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('users')} 
                style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid white', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                <Users size={15} /> Usuários
              </button>
            )}
            <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
              <LogOut size={15} /> Sair
            </button>
          </div>
        </header>

        <div style={{ width: '100%', maxWidth: '900px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#888' }} />
            <input
              type="text"
              placeholder="Buscar em todas as marcas..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 35px 10px 38px', borderRadius: '8px', border: '2px solid #059669', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
            />
            {globalSearchTerm && (
              <button onClick={() => setGlobalSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {globalSearchTerm ? (
          <div style={{ width: '100%', maxWidth: '900px', overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h3 style={{ padding: '12px 15px', margin: 0, backgroundColor: '#f1f5f9', color: '#334155', borderBottom: '1px solid #e2e8f0', fontSize: '14px' }}>
              Resultados ({filteredGlobalProducts.length})
            </h3>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                    <th style={{ padding: '10px' }}>Marca</th>
                    <th style={{ padding: '10px' }}>Produto</th>
                    <th style={{ padding: '10px' }}>À Vista</th>
                    <th style={{ padding: '10px' }}>À Prazo</th>
                    <th style={{ padding: '10px' }}>Valor M</th>
                    <th style={{ padding: '10px' }}>Valor M²</th>
                    <th style={{ padding: '10px' }}>Largura</th>
                    <th style={{ padding: '10px' }}>Gram.</th>
                    <th style={{ padding: '10px' }}>Composição</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGlobalProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredGlobalProducts.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>
                          <span style={{ backgroundColor: p.marca === 'manatex' ? '#d1fae5' : '#f3f4f6', color: p.marca === 'manatex' ? '#065f46' : '#111827', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {p.marca?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.nome}</td>
                        <td style={{ padding: '10px', color: p.marca === 'manatex' ? '#059669' : '#111827', fontWeight: 'bold' }}>{formatMoeda(p.a_vista)}</td>
                        <td style={{ padding: '10px' }}>{formatMoeda(p.a_prazo)}</td>
                        <td style={{ padding: '10px' }}>{formatMoeda(p.valor_m)}</td>
                        <td style={{ padding: '10px' }}>{formatMoeda(p.valor_m2)}</td>
                        <td style={{ padding: '10px' }}>{formatNumero(p.largura, 'm')}</td>
                        <td style={{ padding: '10px' }}>{formatNumero(p.gramatura, 'g')}</td>
                        <td style={{ padding: '10px', fontSize: '12px' }}>{p.composicao}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ color: '#1e293b', marginBottom: '15px', fontSize: '16px', textAlign: 'center' }}>Selecione a marca para ver a tabela:</h2>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px', width: '100%' }}>
              <div 
                onClick={() => { setSelectedBrand('manatex'); setActiveTab('products'); }}
                style={{ flex: '1 1 260px', backgroundColor: 'white', border: '2px solid #059669', borderRadius: '12px', padding: '20px 15px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                <img src="/mana.jpg" alt="Manatex Têxtil" style={{ maxHeight: '50px', maxWidth: '100%', objectFit: 'contain', marginBottom: '10px' }} />
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Tabela de produtos Manatex</p>
              </div>

              <div 
                onClick={() => { setSelectedBrand('msports'); setActiveTab('products'); }}
                style={{ flex: '1 1 260px', backgroundColor: '#111827', border: '2px solid #111827', borderRadius: '12px', padding: '20px 15px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                <img src="/msports.jpg" alt="MSports" style={{ maxHeight: '50px', maxWidth: '100%', objectFit: 'contain', marginBottom: '10px', backgroundColor: 'white', padding: '4px', borderRadius: '4px' }} />
                <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Tabela de produtos MSports</p>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // PAINEL DE PRODUTOS E USUÁRIOS
  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '10px', boxSizing: 'border-box' }}>
      
      {/* HEADER RESPONSIVO PARA CELULAR */}
      <header style={{ 
        backgroundColor: brandColor, 
        color: 'white', 
        padding: '12px 15px', 
        borderRadius: '10px', 
        display: 'flex', 
        flexDirection: 'row',
        flexWrap: 'wrap', 
        justify: 'space-between', 
        alignItems: 'center', 
        gap: '10px', 
        marginBottom: '15px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedBrand && (
            <button 
              onClick={() => setSelectedBrand(null)} 
              title="Voltar"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', lineHeight: '1.2' }}>
              {activeTab === 'users' ? 'Usuários' : `Tabela ${selectedBrand?.toUpperCase()}`}
            </h1>
            <span style={{ fontSize: '11px', opacity: 0.85 }}>
              Perfil: <strong>{profile?.role === 'admin' ? 'Admin' : 'Usuário'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {profile?.role === 'admin' && (
            <>
              {selectedBrand && (
                <button 
                  onClick={() => setActiveTab('products')} 
                  style={{ backgroundColor: activeTab === 'products' ? 'rgba(255,255,255,0.25)' : 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  Produtos
                </button>
              )}
              <button 
                onClick={() => setActiveTab('users')} 
                style={{ backgroundColor: activeTab === 'users' ? 'rgba(255,255,255,0.25)' : 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <Users size={14} /> Usuários
              </button>
              {activeTab === 'products' && selectedBrand && (
                <button onClick={() => openModal()} style={{ backgroundColor: 'white', color: isManatex ? '#059669' : '#111827', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <Plus size={14} /> Novo
                </button>
              )}
            </>
          )}

          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {/* ABA DE USUÁRIOS */}
      {activeTab === 'users' && profile?.role === 'admin' ? (
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Usuários e Permissões</h2>
            <button onClick={() => { setActiveTab('products'); if(!selectedBrand) setSelectedBrand('manatex'); }} style={{ color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
              Voltar
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#111827', color: 'white' }}>
                  <th style={{ padding: '10px' }}>E-mail</th>
                  <th style={{ padding: '10px' }}>Perfil</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{u.email}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ backgroundColor: u.role === 'admin' ? '#dbeafe' : '#f3f4f6', color: u.role === 'admin' ? '#1e40af' : '#374151', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ color: u.approved ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '12px' }}>
                        {u.approved ? 'Autorizado' : 'Pendente'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                      <button 
                        onClick={() => toggleApproval(u.id, u.approved)} 
                        style={{ backgroundColor: u.approved ? '#fee2e2' : '#dcfce7', color: u.approved ? '#991b1b' : '#166534', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                        {u.approved ? 'Bloquear' : 'Autorizar'}
                      </button>
                      <button 
                        onClick={() => toggleRole(u.id, u.role)} 
                        style={{ backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #ccc', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                        Mudar Perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ABA DE PRODUTOS */
        <>
          <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
              <input
                type="text"
                placeholder={`Buscar em ${selectedBrand?.toUpperCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 8px 8px 35px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', maxWidth: '100%', justifyContent: 'flex-start' }}>
              <button 
                onClick={handleExportExcel}
                style={{ flex: '1 1 auto', backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <Download size={15} /> Exportar Excel
              </button>
              <button 
                onClick={() => setSelectedBrand(null)} 
                style={{ flex: '1 1 auto', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
                Trocar Marca
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>Carregando produtos...</p>
          ) : (
            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', width: '100%' }}>
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: isManatex ? '#059669' : '#111827', color: 'white' }}>
                    <th style={{ padding: '10px' }}>Produto</th>
                    <th style={{ padding: '10px' }}>À Vista</th>
                    <th style={{ padding: '10px' }}>À Prazo</th>
                    <th style={{ padding: '10px' }}>Valor M</th>
                    <th style={{ padding: '10px' }}>Valor M²</th>
                    <th style={{ padding: '10px' }}>Largura</th>
                    <th style={{ padding: '10px' }}>Gram.</th>
                    <th style={{ padding: '10px' }}>Rend. M</th>
                    <th style={{ padding: '10px' }}>Rend. M²</th>
                    <th style={{ padding: '10px' }}>Composição</th>
                    {profile?.role === 'admin' && <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>
                        Nenhum produto cadastrado para <strong>{selectedBrand?.toUpperCase()}</strong>.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.nome}</td>
                        <td style={{ padding: '10px', color: isManatex ? '#059669' : '#111827', fontWeight: 'bold' }}>{formatMoeda(p.a_vista)}</td>
                        <td style={{ padding: '10px' }}>{formatMoeda(p.a_prazo)}</td>
                        <td style={{ padding: '10px' }}>{formatMoeda(p.valor_m)}</td>
                        <td style={{ padding: '10px' }}>{formatMoeda(p.valor_m2)}</td>
                        <td style={{ padding: '10px' }}>{formatNumero(p.largura, 'm')}</td>
                        <td style={{ padding: '10px' }}>{formatNumero(p.gramatura, 'g')}</td>
                        <td style={{ padding: '10px' }}>{formatNumero(p.rendimento_m, 'm')}</td>
                        <td style={{ padding: '10px' }}>{formatNumero(p.rendimento_m2, 'm²')}</td>
                        <td style={{ padding: '10px', fontSize: '12px' }}>{p.composicao}</td>
                        {profile?.role === 'admin' && (
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <button onClick={() => openModal(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', marginRight: '6px' }}>
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* MODAL ADAPTADO PARA DISPOSITIVOS MÓVEIS */}
      {isModalOpen && profile?.role === 'admin' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>
                {editingId ? 'Editar Produto' : `Novo Produto (${selectedBrand?.toUpperCase()})`}
              </h3>
              <button onClick={closeModal} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Nome do Produto</label>
                <input type="text" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>À Vista (R$)</label>
                  <input type="text" value={formData.a_vista} onChange={e => setFormData({...formData, a_vista: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="0,00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>À Prazo (R$)</label>
                  <input type="text" value={formData.a_prazo} onChange={e => setFormData({...formData, a_prazo: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="0,00" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Valor M (R$)</label>
                  <input type="text" value={formData.valor_m} onChange={e => setFormData({...formData, valor_m: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="0,00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Valor M² (R$)</label>
                  <input type="text" value={formData.valor_m2} onChange={e => setFormData({...formData, valor_m2: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="0,00" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Largura (m)</label>
                  <input type="text" value={formData.largura} onChange={e => setFormData({...formData, largura: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="1,60" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Gramatura (g)</label>
                  <input type="text" value={formData.gramatura} onChange={e => setFormData({...formData, gramatura: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="180" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Rendimento M</label>
                  <input type="text" value={formData.rendimento_m} onChange={e => setFormData({...formData, rendimento_m: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="3,10" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Rendimento M²</label>
                  <input type="text" value={formData.rendimento_m2} onChange={e => setFormData({...formData, rendimento_m2: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="5,00" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Composição</label>
                <input type="text" value={formData.composicao} onChange={e => setFormData({...formData, composicao: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="100% Algodão" />
              </div>
              <button type="submit" style={{ backgroundColor: brandColor, color: 'white', border: 'none', padding: '10px', borderRadius: '5px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer' }}>
                {editingId ? 'Atualizar Produto' : 'Cadastrar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
