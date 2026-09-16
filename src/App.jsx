import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Search, Plus, Edit2, Trash2, Package, X, LogOut, Lock, UserPlus, Users, ShieldAlert, ArrowLeft, Layers } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  // Marca selecionada: null (tela de seleção), 'manatex' ou 'msports'
  const [selectedBrand, setSelectedBrand] = useState(null)

  // Aba selecionada pelo Admin: 'products' ou 'users'
  const [activeTab, setActiveTab] = useState('products')

  // Produtos
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Gerenciamento de Usuários (Admin)
  const [usersList, setUsersList] = useState([])

  const [formData, setFormData] = useState({
    nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '',
    largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: ''
  })

  // 1. Monitorar Autenticação e Perfil
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUserProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUserProfile(session.user.id)
      else setProfile(null)
    })
// Função para formatar Moeda (R$ 73,56)
const formatMoeda = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '-';
  // Se vier como string (texto), converte trocando ponto por número
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor);
  if (isNaN(num)) return '-';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Função para formatar Medidas/Decimais (1,75 / 8,33)
const formatNumero = (valor, sufixo = '') => {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor);
  if (isNaN(num)) return '-';
  return `${num.toLocaleString('pt-BR')}${sufixo}`;
};
    return () => subscription.unsubscribe()
  }, [])

  // Buscar perfil do usuário logado
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar perfil:', error)
        return
      }

      if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
    }
  }

  // Buscar Produtos (Filtrado por Marca se selecionada)
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

  // Buscar Todos os Usuários (Apenas Admin)
  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setUsersList(data)
  }

  useEffect(() => {
    if (session && profile?.approved) {
      if (selectedBrand) fetchProducts()
      if (profile?.role === 'admin') fetchUsers()
    }
  }, [session, profile, selectedBrand])

  // Login / Cadastro
  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setAuthError(error.message)
      } else {
        setAuthMessage('Cadastro realizado! Por favor, confirme seu e-mail e aguarde a aprovação do administrador.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError('E-mail ou senha incorretos.')
    }
  }

  const handleLogout = () => {
    setSelectedBrand(null)
    supabase.auth.signOut()
  }

  // --- Ações do Admin em Usuários ---
  const toggleApproval = async (userId, currentStatus) => {
    await supabase.from('profiles').update({ approved: !currentStatus }).eq('id', userId)
    fetchUsers()
  }

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchUsers()
  }

  // --- CRUD Produtos ---
  const handleSaveProduct = async (e) => {
    e.preventDefault()
    const payload = {
      nome: formData.nome,
      marca: selectedBrand, // Associa à marca selecionada atualmente
      a_vista: formData.a_vista ? parseFloat(formData.a_vista) : null,
      a_prazo: formData.a_prazo ? parseFloat(formData.a_prazo) : null,
      valor_m: formData.valor_m ? parseFloat(formData.valor_m) : null,
      valor_m2: formData.valor_m2 ? parseFloat(formData.valor_m2) : null,
      largura: formData.largura ? parseFloat(formData.largura) : null,
      gramatura: formData.gramatura ? parseFloat(formData.gramatura) : null,
      rendimento_m: formData.rendimento_m ? parseFloat(formData.rendimento_m) : null,
      rendimento_m2: formData.rendimento_m2 ? parseFloat(formData.rendimento_m2) : null,
      composicao: formData.composicao
    }

    if (editingId) {
      await supabase.from('produtos').update(payload).eq('id', editingId)
    } else {
      await supabase.from('produtos').insert([payload])
    }

    closeModal()
    fetchProducts()
  }

  const handleDelete = async (id) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      await supabase.from('produtos').delete().eq('id', id)
      fetchProducts()
    }
  }

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id)
      setFormData({
        nome: product.nome || '', a_vista: product.a_vista || '', a_prazo: product.a_prazo || '',
        valor_m: product.valor_m || '', valor_m2: product.valor_m2 || '', largura: product.largura || '',
        gramatura: product.gramatura || '', rendimento_m: product.rendimento_m || '',
        rendimento_m2: product.rendimento_m2 || '', composicao: product.composicao || ''
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

  // 1. TELA DE LOGIN / CADASTRO
  if (!session) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <form onSubmit={handleAuth} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '360px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', color: '#059669' }}>
            {isSignUp ? <UserPlus size={40} /> : <Lock size={40} />}
            <h2 style={{ margin: '10px 0 0 0', color: '#1e293b' }}>{isSignUp ? 'Criar Conta' : 'Catálogo de Preços'}</h2>
          </div>

          {authError && <p style={{ color: 'red', fontSize: '13px', textAlign: 'center' }}>{authError}</p>}
          {authMessage && <p style={{ color: 'green', fontSize: '13px', textAlign: 'center' }}>{authMessage}</p>}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Senha</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} placeholder="Mínimo 6 caracteres" />
          </div>

          <button type="submit" style={{ width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>
            {isSignUp ? 'Cadastrar' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); setAuthMessage(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>
              {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se aqui'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // 2. AGUARDANDO APROVAÇÃO DO ADMIN
  if (profile && !profile.approved) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <ShieldAlert size={50} color="#eab308" style={{ marginBottom: '10px' }} />
          <h2 style={{ color: '#1e293b', margin: '0 0 10px 0' }}>Aguardando Autorização</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
            Sua conta foi confirmada, porém precisa ser **aprovada por um administrador** antes de liberar o acesso aos preços.
          </p>
          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px' }}>
            Sair
          </button>
        </div>
      </div>
    )
  }

  // 3. SELEÇÃO DE MARCA (MANATEX OU MSPORTS)
  if (!selectedBrand && activeTab !== 'users') {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Cabeçalho */}
        <header style={{ width: '100%', maxWidth: '800px', backgroundColor: '#059669', color: 'white', padding: '15px 20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px' }}>Selecione a Marca</h1>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              Nível: <strong>{profile?.role === 'admin' ? 'Administrador' : 'Usuário'}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setActiveTab('users')} 
                style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={16} /> Usuários
              </button>
            )}
            <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        {/* Cards de Seleção de Marca */}
        <h2 style={{ color: '#1e293b', marginBottom: '30px' }}>Qual tabela de produtos deseja acessar?</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px', width: '100%' }}>
          
          {/* Card Manatex */}
          <div 
            onClick={() => { setSelectedBrand('manatex'); setActiveTab('products'); }}
            style={{ flex: '1 1 300px', backgroundColor: 'white', border: '2px solid #059669', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }}>
            <Layers size={48} color="#059669" style={{ marginBottom: '15px' }} />
            <h2 style={{ margin: '0 0 10px 0', color: '#059669', fontSize: '24px' }}>MANATEX</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Clique para acessar a tabela de produtos Manatex</p>
          </div>

          {/* Card MSports */}
          <div 
            onClick={() => { setSelectedBrand('msports'); setActiveTab('products'); }}
            style={{ flex: '1 1 300px', backgroundColor: 'white', border: '2px solid #2563eb', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }}>
            <Package size={48} color="#2563eb" style={{ marginBottom: '15px' }} />
            <h2 style={{ margin: '0 0 10px 0', color: '#2563eb', fontSize: '24px' }}>MSPORTS</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Clique para acessar a tabela de produtos MSports</p>
          </div>

        </div>
      </div>
    )
  }

  // 4. PAINEL PRINCIPAL (Tabela da Marca Selecionada ou Gerenciamento de Usuários)
  const isManatex = selectedBrand === 'manatex'
  const brandColor = isManatex ? '#059669' : '#2563eb'

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '20px' }}>
      
      {/* Cabeçalho */}
      <header style={{ backgroundColor: brandColor, color: 'white', padding: '15px 20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {selectedBrand && (
            <button 
              onClick={() => setSelectedBrand(null)} 
              title="Voltar para seleção de marcas"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: '20px' }}>
              {activeTab === 'users' ? 'Gerenciamento de Usuários' : `Tabela ${selectedBrand?.toUpperCase()}`}
            </h1>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              Nível: <strong>{profile?.role === 'admin' ? 'Administrador' : 'Usuário'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Navegação do Admin */}
          {profile?.role === 'admin' && (
            <>
              {selectedBrand && (
                <button 
                  onClick={() => setActiveTab('products')} 
                  style={{ backgroundColor: activeTab === 'products' ? 'rgba(0,0,0,0.2)' : 'transparent', color: 'white', border: '1px solid white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                  Produtos
                </button>
              )}
              <button 
                onClick={() => setActiveTab('users')} 
                style={{ backgroundColor: activeTab === 'users' ? 'rgba(0,0,0,0.2)' : 'transparent', color: 'white', border: '1px solid white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={16} /> Usuários
              </button>
              {activeTab === 'products' && selectedBrand && (
                <button onClick={() => openModal()} style={{ backgroundColor: 'white', color: brandColor, border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Plus size={16} /> Novo Produto ({selectedBrand.toUpperCase()})
                </button>
              )}
            </>
          )}

          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      {/* ABA DE GERENCIAMENTO DE USUÁRIOS (Apenas Admin) */}
      {activeTab === 'users' && profile?.role === 'admin' ? (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Usuários e Permissões</h2>
            <button onClick={() => { setActiveTab('products'); if(!selectedBrand) setSelectedBrand('manatex'); }} style={{ color: brandColor, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Voltar para Produtos
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', color: 'white', fontSize: '14px' }}>
                <th style={{ padding: '12px' }}>E-mail</th>
                <th style={{ padding: '12px' }}>Perfil (Role)</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: u.role === 'admin' ? '#dbeafe' : '#f3f4f6', color: u.role === 'admin' ? '#1e40af' : '#374151', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: u.approved ? '#059669' : '#dc2626', fontWeight: 'bold', fontSize: '13px' }}>
                      {u.approved ? 'Autorizado' : 'Pendente'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <button 
                      onClick={() => toggleApproval(u.id, u.approved)} 
                      style={{ backgroundColor: u.approved ? '#fee2e2' : '#dcfce7', color: u.approved ? '#991b1b' : '#166534', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                      {u.approved ? 'Bloquear / Revogar' : 'Autorizar Acesso'}
                    </button>
                    <button 
                      onClick={() => toggleRole(u.id, u.role)} 
                      style={{ backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Mudar para {u.role === 'admin' ? 'Usuário' : 'Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ABA DE PRODUTOS DA MARCA SELECIONADA */
        <>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }} />
              <input
                type="text"
                placeholder={`Buscar produtos ${selectedBrand?.toUpperCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button 
              onClick={() => setSelectedBrand(null)} 
              style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
              Trocar Marca
            </button>
          </div>

          {loading ? (
            <p>Carregando produtos...</p>
          ) : (
            <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: 'white', fontSize: '14px' }}>
                    <th style={{ padding: '12px' }}>Produto</th>
                    <th style={{ padding: '12px' }}>À Vista</th>
                    <th style={{ padding: '12px' }}>À Prazo</th>
                    <th style={{ padding: '12px' }}>Valor M</th>
                    <th style={{ padding: '12px' }}>Valor M²</th>
                    <th style={{ padding: '12px' }}>Largura</th>
                    <th style={{ padding: '12px' }}>Gram.</th>
                    <th style={{ padding: '12px' }}>Rend. M</th>
                    <th style={{ padding: '12px' }}>Rend. M²</th>
                    <th style={{ padding: '12px' }}>Composição</th>
                    {profile?.role === 'admin' && <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        Nenhum produto cadastrado para a marca <strong>{selectedBrand?.toUpperCase()}</strong>.
                      </td>
                    </tr>
                  ) : (
                    {filteredProducts.map((p) => (
  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
    <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.nome}</td>
    
    {/* Preços com R$ e Vírgula (ex: R$ 73,56) */}
    <td style={{ padding: '12px', color: brandColor, fontWeight: 'bold' }}>
      {p.a_vista !== null && p.a_vista !== undefined 
        ? p.a_vista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
        : '-'}
    </td>
    <td style={{ padding: '12px' }}>
      {p.a_prazo !== null && p.a_prazo !== undefined 
        ? p.a_prazo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
        : '-'}
    </td>
    <td style={{ padding: '12px' }}>
      {p.valor_m !== null && p.valor_m !== undefined 
        ? p.valor_m.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
        : '-'}
    </td>
    <td style={{ padding: '12px' }}>
      {p.valor_m2 !== null && p.valor_m2 !== undefined 
        ? p.valor_m2.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
        : '-'}
    </td>

    {/* Medidas com vírgula para decimais (ex: 1,75m / 8,33) */}
    <td style={{ padding: '12px' }}>
      {p.largura !== null && p.largura !== undefined 
        ? `${p.largura.toLocaleString('pt-BR')}m` 
        : '-'}
    </td>
    <td style={{ padding: '12px' }}>
      {p.gramatura !== null && p.gramatura !== undefined 
        ? `${p.gramatura.toLocaleString('pt-BR')}g` 
        : '-'}
    </td>
    <td style={{ padding: '12px' }}>
      {p.rendimento_m !== null && p.rendimento_m !== undefined 
        ? p.rendimento_m.toLocaleString('pt-BR') 
        : '-'}
    </td>
    <td style={{ padding: '12px' }}>
      {p.rendimento_m2 !== null && p.rendimento_m2 !== undefined 
        ? p.rendimento_m2.toLocaleString('pt-BR') 
        : '-'}
    </td>

    <td style={{ padding: '12px', fontSize: '13px' }}>{p.composicao}</td>

    {profile?.role === 'admin' && (
      <td style={{ padding: '12px', textAlign: 'center' }}>
        <button onClick={() => openModal(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', marginRight: '8px' }}>
          <Edit2 size={16} />
        </button>
        <button onClick={() => handleDelete(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
          <Trash2 size={16} />
        </button>
      </td>
    )}
  </tr>
))}

      {/* Modal Cadastro/Edição de Produto */}
      {isModalOpen && profile?.role === 'admin' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>
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
                  <input type="number" step="0.01" value={formData.a_vista} onChange={e => setFormData({...formData, a_vista: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>À Prazo (R$)</label>
                  <input type="number" step="0.01" value={formData.a_prazo} onChange={e => setFormData({...formData, a_prazo: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Valor M (R$)</label>
                  <input type="number" step="0.01" value={formData.valor_m} onChange={e => setFormData({...formData, valor_m: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Valor M² (R$)</label>
                  <input type="number" step="0.01" value={formData.valor_m2} onChange={e => setFormData({...formData, valor_m2: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Largura (m)</label>
                  <input type="number" step="0.01" value={formData.largura} onChange={e => setFormData({...formData, largura: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Gramatura (g)</label>
                  <input type="number" value={formData.gramatura} onChange={e => setFormData({...formData, gramatura: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Rendimento M</label>
                  <input type="number" step="0.01" value={formData.rendimento_m} onChange={e => setFormData({...formData, rendimento_m: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Rendimento M²</label>
                  <input type="number" step="0.01" value={formData.rendimento_m2} onChange={e => setFormData({...formData, rendimento_m2: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Composição</label>
                <input type="text" value={formData.composicao} onChange={e => setFormData({...formData, composicao: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 15px', backgroundColor: brandColor, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
