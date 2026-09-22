import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Search, Plus, Edit2, Trash2, X, LogOut, Lock, UserPlus, Users, ShieldAlert, ArrowLeft, Download, KeyRound, Image as ImageIcon, Palette } from 'lucide-react'

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

  // Estado para controlo da imagem selecionada em cada produto
  const [selectedColorsMap, setSelectedColorsMap] = useState({})

  const [usersList, setUsersList] = useState([])

  const [formData, setFormData] = useState({
    nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '',
    largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: '',
    descricao: '', imagem_url: '', tecnologias: '', conforto_text: '', versatil_text: ''
  })

  // Lista dinâmica de cores no modal de edição
  const [formCores, setFormCores] = useState([])

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

  const recalcularValores = (aVistaVal, rendMVal, rendM2Val) => {
    const aVista = parseInputValue(aVistaVal)
    const rendM = parseInputValue(rendMVal)
    const rendM2 = parseInputValue(rendM2Val)

    let aPrazo = ''
    let valorM = ''
    let valorM2 = ''

    if (aVista !== null && !isNaN(aVista)) {
      const calcPrazo = aVista * 1.06
      aPrazo = calcPrazo.toFixed(2).replace('.', ',')

      if (rendM && rendM > 0) {
        const calcValorM = aVista / rendM
        valorM = calcValorM.toFixed(2).replace('.', ',')
      }

      if (rendM2 && rendM2 > 0) {
        const calcValorM2 = aVista / rendM2
        valorM2 = calcValorM2.toFixed(2).replace('.', ',')
      }
    }

    return { aPrazo, valorM, valorM2 }
  }

  const handleAVistaChange = (e) => {
    const novoAVista = e.target.value
    const { aPrazo, valorM, valorM2 } = recalcularValores(novoAVista, formData.rendimento_m, formData.rendimento_m2)
    setFormData((prev) => ({ ...prev, a_vista: novoAVista, a_prazo: aPrazo, valor_m: valorM, valor_m2: valorM2 }))
  }

  const handleRendimentoMChange = (e) => {
    const novoRendM = e.target.value
    const { valorM } = recalcularValores(formData.a_vista, novoRendM, formData.rendimento_m2)
    setFormData((prev) => ({ ...prev, rendimento_m: novoRendM, valor_m: valorM }))
  }

  const handleRendimentoM2Change = (e) => {
    const novoRendM2 = e.target.value
    const { valorM2 } = recalcularValores(formData.a_vista, formData.rendimento_m, novoRendM2)
    setFormData((prev) => ({ ...prev, rendimento_m2: novoRendM2, valor_m2: valorM2 }))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUserProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') setIsResettingPassword(true)
      if (session) fetchUserProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
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
      .select('*, produto_cores(*)')
      .eq('marca', selectedBrand)
      .order('id', { ascending: true })

    if (!error) setProducts(data || [])
    setLoading(false)
  }

  const fetchAllProducts = async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('*, produto_cores(*)')
      .order('nome', { ascending: true })

    if (!error) setAllProducts(data || [])
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
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
        setAuthMessage('Registo efetuado! Confirme o seu e-mail.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError('E-mail ou palavra-passe incorretos.')
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) setAuthError('Erro: ' + error.message)
    else setAuthMessage('E-mail de recuperação enviado!')
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setAuthError('Erro: ' + error.message)
    else {
      setAuthMessage('Palavra-passe alterada!')
      setIsResettingPassword(false)
      setNewPassword('')
    }
  }

  const handleLogout = () => {
    setSelectedBrand(null)
    supabase.auth.signOut()
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    const payload = {
      nome: formData.nome,
      marca: selectedBrand || 'manatex',
      a_vista: parseInputValue(formData.a_vista),
      a_prazo: parseInputValue(formData.a_prazo),
      valor_m: parseInputValue(formData.valor_m),
      valor_m2: parseInputValue(formData.valor_m2),
      largura: parseInputValue(formData.largura),
      gramatura: parseInputValue(formData.gramatura),
      rendimento_m: parseInputValue(formData.rendimento_m),
      rendimento_m2: parseInputValue(formData.rendimento_m2),
      composicao: formData.composicao,
      descricao: formData.descricao,
      imagem_url: formData.imagem_url,
      tecnologias: formData.tecnologias,
      conforto_text: formData.conforto_text,
      versatil_text: formData.versatil_text
    }

    let productId = editingId

    if (editingId) {
      await supabase.from('produtos').update(payload).eq('id', editingId)
      await supabase.from('produto_cores').delete().eq('produto_id', editingId)
    } else {
      const { data } = await supabase.from('produtos').insert([payload]).select()
      if (data && data[0]) productId = data[0].id
    }

    if (productId && formCores.length > 0) {
      const coresPayload = formCores
        .filter(c => c.nome_cor.trim() !== '')
        .map(c => ({
          produto_id: productId,
          nome_cor: c.nome_cor,
          codigo_hex: c.codigo_hex || '#000000',
          imagem_url: c.imagem_url || ''
        }))

      if (coresPayload.length > 0) {
        await supabase.from('produto_cores').insert(coresPayload)
      }
    }

    closeModal()
    fetchProducts()
    fetchAllProducts()
  }

  const handleDelete = async (id) => {
    if (confirm("Pretende eliminar este produto?")) {
      await supabase.from('produtos').delete().eq('id', id)
      fetchProducts()
      fetchAllProducts()
    }
  }

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id)
      
      const aVistaStr = product.a_vista !== null && product.a_vista !== undefined ? String(product.a_vista).replace('.', ',') : ''
      const rendMStr = product.rendimento_m !== null && product.rendimento_m !== undefined ? String(product.rendimento_m).replace('.', ',') : ''
      const rendM2Str = product.rendimento_m2 !== null && product.rendimento_m2 !== undefined ? String(product.rendimento_m2).replace('.', ',') : ''

      const { aPrazo, valorM, valorM2 } = recalcularValores(aVistaStr, rendMStr, rendM2Str)

      setFormData({
        nome: product.nome || '',
        a_vista: aVistaStr,
        a_prazo: product.a_prazo !== null && product.a_prazo !== undefined ? String(product.a_prazo).replace('.', ',') : aPrazo,
        valor_m: product.valor_m !== null && product.valor_m !== undefined ? String(product.valor_m).replace('.', ',') : valorM,
        valor_m2: product.valor_m2 !== null && product.valor_m2 !== undefined ? String(product.valor_m2).replace('.', ',') : valorM2,
        largura: product.largura !== null && product.largura !== undefined ? String(product.largura).replace('.', ',') : '',
        gramatura: product.gramatura !== null && product.gramatura !== undefined ? String(product.gramatura).replace('.', ',') : '',
        rendimento_m: rendMStr,
        rendimento_m2: rendM2Str,
        composicao: product.composicao || '',
        descricao: product.descricao || '',
        imagem_url: product.imagem_url || '',
        tecnologias: product.tecnologias || '',
        conforto_text: product.conforto_text || '',
        versatil_text: product.versatil_text || ''
      })

      setFormCores(product.produto_cores || [])
    } else {
      setEditingId(null)
      setFormData({ 
        nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '', 
        largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: '',
        descricao: '', imagem_url: '', tecnologias: '', conforto_text: '', versatil_text: ''
      })
      setFormCores([])
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormCores([])
  }

  const addCorField = () => {
    setFormCores([...formCores, { nome_cor: '', codigo_hex: '#000000', imagem_url: '' }])
  }

  const removeCorField = (index) => {
    setFormCores(formCores.filter((_, i) => i !== index))
  }

  const handleCorChange = (index, field, value) => {
    const newCores = [...formCores]
    newCores[index][field] = value
    setFormCores(newCores)
  }

  const filteredProducts = products.filter(p =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.composicao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGlobalProducts = allProducts.filter(p =>
    p.nome?.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    p.composicao?.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    p.descricao?.toLowerCase().includes(globalSearchTerm.toLowerCase())
  )

  const isManatex = selectedBrand === 'manatex'
  const brandColor = isManatex ? '#059669' : '#111827'

  // LOGIN E RESTANTES TELAS (MANTIDAS CONFORME O ANTERIOR)
  if (!session) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
        <form onSubmit={handleAuth} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '360px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', color: '#059669' }}>
            <Lock size={40} />
            <h2 style={{ margin: '10px 0 0 0', color: '#1e293b', fontSize: '20px' }}>Catálogo de Preços</h2>
          </div>
          {authError && <p style={{ color: 'red', fontSize: '13px', textAlign: 'center' }}>{authError}</p>}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Palavra-passe</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            Entrar
          </button>
        </form>
      </div>
    )
  }

  // TELA INICIAL / BUSCA GLOBAL DE PRODUTOS
  if (!selectedBrand && activeTab !== 'users') {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <header style={{ width: '100%', maxWidth: '900px', backgroundColor: '#059669', color: 'white', padding: '15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '18px' }}>Catálogo Geral</h1>
          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LogOut size={15} /> Sair
          </button>
        </header>

        <div style={{ width: '100%', maxWidth: '900px', marginBottom: '25px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={20} style={{ position: 'absolute', left: '15px', top: '14px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Digite o nome do produto ou tecido para buscar..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 40px 12px 45px', borderRadius: '10px', border: '2px solid #059669', outline: 'none', boxSizing: 'border-box', fontSize: '15px' }}
            />
          </div>
        </div>

        {globalSearchTerm ? (
          <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {filteredGlobalProducts.map((p) => {
              // Verifica qual imagem está selecionada dinamicamente para este produto
              const currentImage = selectedColorsMap[p.id] || p.imagem_url

              return (
                <div key={p.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '25px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '18px', right: '18px', backgroundColor: p.marca === 'manatex' ? '#d1fae5' : '#f3f4f6', color: p.marca === 'manatex' ? '#065f46' : '#111827', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {p.marca}
                  </span>

                  <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', margin: '0 0 8px 0', color: '#0f172a', fontWeight: 'bold' }}>
                      {p.nome?.toUpperCase()}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                      {p.descricao || 'Excelente caimento e qualidade garantida.'}
                    </p>
                  </div>

                  {/* IMAGEM PRINCIPAL (MUTA DINAMICAMENTE AO CLICAR NA COR) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0' }}>
                    {currentImage ? (
                      <img src={currentImage} alt={p.nome} style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', transition: 'all 0.3s ease' }} />
                    ) : (
                      <div style={{ width: '120px', height: '90px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <ImageIcon size={28} />
                      </div>
                    )}

                    {/* SEÇÃO DE VARIANTES/CORES (BOLINHAS CLICÁVEIS) */}
                    {p.produto_cores && p.produto_cores.length > 0 && (
                      <div style={{ marginTop: '15px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                          CORES DISPONÍVEIS:
                        </span>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {/* Opção para voltar à imagem original padrão */}
                          {p.imagem_url && (
                            <button
                              onClick={() => setSelectedColorsMap({ ...selectedColorsMap, [p.id]: p.imagem_url })}
                              title="Foto Principal"
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: currentImage === p.imagem_url ? '3px solid #059669' : '1px solid #ccc',
                                cursor: 'pointer',
                                backgroundColor: '#f8fafc',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}
                            >
                              Pad
                            </button>
                          )}

                          {p.produto_cores.map((cor) => (
                            <button
                              key={cor.id}
                              onClick={() => {
                                if (cor.imagem_url) {
                                  setSelectedColorsMap({ ...selectedColorsMap, [p.id]: cor.imagem_url })
                                }
                              }}
                              title={cor.nome_cor}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: cor.codigo_hex || '#000',
                                border: currentImage === cor.imagem_url ? '3px solid #059669' : '2px solid white',
                                boxShadow: '0 0 0 1px #cbd5e1',
                                cursor: cor.imagem_url ? 'pointer' : 'default',
                                opacity: cor.imagem_url ? 1 : 0.6
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FICHA TÉCNICA */}
                  <div style={{ border: '1.5px solid #c8d0f8', borderRadius: '12px', padding: '10px 20px', margin: '20px 0', backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e7ff', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Composição</span>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.composicao || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e7ff', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Gramatura</span>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{formatNumero(p.gramatura, 'g')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Largura</span>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{formatNumero(p.largura, 'm')}</span>
                    </div>
                  </div>

                  {/* VALORES */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>À Vista</span>
                      <strong style={{ fontSize: '15px', color: '#059669' }}>{formatMoeda(p.a_vista)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>À Prazo (+6%)</span>
                      <strong style={{ fontSize: '14px', color: '#334155' }}>{formatMoeda(p.a_prazo)}</strong>
                    </div>
                  </div>

                  {profile?.role === 'admin' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '15px' }}>
                      <button onClick={() => openModal(p)} style={{ border: 'none', background: '#e2e8f0', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit2 size={14} /> Editar / Adicionar Cores
                      </button>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '900px' }}>
            <div onClick={() => { setSelectedBrand('manatex'); setActiveTab('products'); }} style={{ flex: '1 1 260px', backgroundColor: 'white', border: '2px solid #059669', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
              <img src="/mana.jpg" alt="Manatex" style={{ maxHeight: '50px', marginBottom: '10px' }} />
              <p style={{ color: '#64748b', margin: 0 }}>Tabela de produtos Manatex</p>
            </div>
            <div onClick={() => { setSelectedBrand('msports'); setActiveTab('products'); }} style={{ flex: '1 1 260px', backgroundColor: '#111827', border: '2px solid #111827', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
              <img src="/msports.jpg" alt="MSports" style={{ maxHeight: '50px', marginBottom: '10px', backgroundColor: 'white', padding: '4px' }} />
              <p style={{ color: '#9ca3af', margin: 0 }}>Tabela de produtos MSports</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '10px' }}>
      <header style={{ backgroundColor: brandColor, color: 'white', padding: '12px 15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setSelectedBrand(null)} style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ margin: 0, fontSize: '16px' }}>Tabela {selectedBrand?.toUpperCase()}</h1>
        </div>
        {profile?.role === 'admin' && (
          <button onClick={() => openModal()} style={{ backgroundColor: 'white', color: isManatex ? '#059669' : '#111827', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Novo Produto
          </button>
        )}
      </header>

      {/* TABELA DE PRODUTOS */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: brandColor, color: 'white' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Produto</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Cores</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>À Vista</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Composição</th>
              {profile?.role === 'admin' && <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.nome}</td>
                <td style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {p.produto_cores?.map((c) => (
                      <span key={c.id} title={c.nome_cor} style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: c.codigo_hex, border: '1px solid #ccc', display: 'inline-block' }} />
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px', color: '#059669', fontWeight: 'bold' }}>{formatMoeda(p.a_vista)}</td>
                <td style={{ padding: '10px' }}>{p.composicao}</td>
                {profile?.role === 'admin' && (
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button onClick={() => openModal(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb' }}>
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', marginLeft: '8px' }}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL COM A SESSÃO DINÂMICA DE CORES */}
      {isModalOpen && profile?.role === 'admin' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={closeModal} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Nome do Produto</label>
                <input type="text" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="Ex: AERODRY" />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Foto Principal (URL)</label>
                  <input type="text" value={formData.imagem_url} onChange={e => setFormData({...formData, imagem_url: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="https://..." />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>À Vista (R$)</label>
                  <input type="text" value={formData.a_vista} onChange={handleAVistaChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="0,00" />
                </div>
              </div>

              {/* SEÇÃO DINÂMICA PARA ADICIONAR CORES */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', backgroundColor: '#f8fafc', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', color: '#1e293b' }}>
                    <Palette size={16} /> Cores / Variantes do Produto
                  </span>
                  <button type="button" onClick={addCorField} style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                    + Adicionar Cor
                  </button>
                </div>

                {formCores.map((cor, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nome da cor (ex: Marinho)"
                      value={cor.nome_cor}
                      onChange={(e) => handleCorChange(index, 'nome_cor', e.target.value)}
                      style={{ flex: '2', padding: '6px', fontSize: '12px' }}
                    />
                    <input
                      type="color"
                      title="Escolher Cor"
                      value={cor.codigo_hex || '#000000'}
                      onChange={(e) => handleCorChange(index, 'codigo_hex', e.target.value)}
                      style={{ width: '35px', height: '30px', padding: 0, border: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      placeholder="URL da Foto desta cor"
                      value={cor.imagem_url}
                      onChange={(e) => handleCorChange(index, 'imagem_url', e.target.value)}
                      style={{ flex: '3', padding: '6px', fontSize: '12px' }}
                    />
                    <button type="button" onClick={() => removeCorField(index)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Largura (m)</label>
                  <input type="text" value={formData.largura} onChange={e => setFormData({...formData, largura: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Gramatura (g)</label>
                  <input type="text" value={formData.gramatura} onChange={e => setFormData({...formData, gramatura: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Composição</label>
                <input type="text" value={formData.composicao} onChange={e => setFormData({...formData, composicao: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
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
