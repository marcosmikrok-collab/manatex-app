import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Search, Plus, Edit2, Trash2, X, LogOut, Lock, ArrowLeft, Image as ImageIcon, Palette, Sparkles, ShieldAlert, UserPlus, Users, Download, WifiOff, FileText, Calculator, Send, Star } from 'lucide-react'

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
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)

  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // FILTROS E ORDENAÇÃO
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [brandFilter, setBrandFilter] = useState('todas') // 'todas', 'manatex', 'msport'
  const [composicaoFilter, setComposicaoFilter] = useState('todas')
  const [sortBy, setSortBy] = useState('az') // 'az', 'menor_preco', 'maior_preco', 'menor_gramatura'

  // MODAIS E ESTADOS DE ORÇAMENTO / DETALHES
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false)
  const [allProfiles, setAllProfiles] = useState([])
  const [isOrcamentoOpen, setIsOrcamentoOpen] = useState(false)
  
  // FICHA DO PRODUTO SELECIONADO
  const [selectedProductDetails, setSelectedProductDetails] = useState(null)
  const [selectedCorOrcamento, setSelectedCorOrcamento] = useState('')
  const [qtdKgOrcamento, setQtdKgOrcamento] = useState('')
  const [formaPagamentoOrcamento, setFormaPagamentoOrcamento] = useState('a_vista')
  
  const [clienteNome, setClienteNome] = useState('')
  const [itensOrcamento, setItensOrcamento] = useState([])
  const orcamentoPdfRef = useRef(null)

  // CADASTRO / EDIÇÃO DE PRODUTOS (ADMIN)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    nome: '', marca: 'manatex', a_vista: '', a_prazo: '', 
    atacado_cartao_debito: '', atacado_cartao_credito: '', 
    varejo_avista_debito: '', varejo_prazo_credito: '',
    meia_peca_avista_debito: '', meia_peca_prazo_credito: '',
    valor_m: '', valor_m2: '',
    largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: '',
    descricao: '', imagem_url: '', tecnologias: '', conforto_text: '', versatil_text: ''
  })
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
    let atacadoCartaoDebito = ''
    let atacadoCartaoCredito = ''
    let varejoAvistaDebito = ''
    let varejoPrazoCredito = ''
    let meiaPecaAvistaDebito = ''
    let meiaPecaPrazoCredito = ''
    let valorM = ''
    let valorM2 = ''

    if (aVista !== null && !isNaN(aVista)) {
      const calcPrazo = aVista * 1.06
      aPrazo = calcPrazo.toFixed(2).replace('.', ',')

      atacadoCartaoDebito = (aVista * 1.03).toFixed(2).replace('.', ',')
      atacadoCartaoCredito = (calcPrazo * 1.03).toFixed(2).replace('.', ',')

      const calcVarejoAvista = aVista * 1.30
      varejoAvistaDebito = calcVarejoAvista.toFixed(2).replace('.', ',')
      varejoPrazoCredito = (calcVarejoAvista * 1.06).toFixed(2).replace('.', ',')

      const calcMeiaAvista = aVista * 1.15
      meiaPecaAvistaDebito = calcMeiaAvista.toFixed(2).replace('.', ',')
      meiaPecaPrazoCredito = (calcMeiaAvista * 1.06).toFixed(2).replace('.', ',')

      if (rendM && rendM > 0) {
        valorM = (aVista / rendM).toFixed(2).replace('.', ',')
      }

      if (rendM2 && rendM2 > 0) {
        valorM2 = (aVista / rendM2).toFixed(2).replace('.', ',')
      }
    }

    return { 
      aPrazo, 
      atacadoCartaoDebito, 
      atacadoCartaoCredito, 
      varejoAvistaDebito, 
      varejoPrazoCredito,
      meiaPecaAvistaDebito,
      meiaPecaPrazoCredito,
      valorM, 
      valorM2 
    }
  }

  const handleAVistaChange = (e) => {
    const novoAVista = e.target.value
    const calc = recalcularValores(novoAVista, formData.rendimento_m, formData.rendimento_m2)
    setFormData((prev) => ({ 
      ...prev, 
      a_vista: novoAVista, 
      a_prazo: calc.aPrazo, 
      atacado_cartao_debito: calc.atacadoCartaoDebito, 
      atacado_cartao_credito: calc.atacadoCartaoCredito, 
      varejo_avista_debito: calc.varejoAvistaDebito,
      varejo_prazo_credito: calc.varejoPrazoCredito,
      meia_peca_avista_debito: calc.meiaPecaAvistaDebito,
      meia_peca_prazo_credito: calc.meiaPecaPrazoCredito,
      valor_m: calc.valorM, 
      valor_m2: calc.valorM2 
    }))
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUserProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (data) {
        setProfile(data)
        localStorage.setItem('cache_user_profile', JSON.stringify(data))
      } else {
        setProfile({ id: userId, role: 'user', approved: false })
      }
    } catch (err) {
      const savedProfile = localStorage.getItem('cache_user_profile')
      if (savedProfile) setProfile(JSON.parse(savedProfile))
      else setProfile({ id: userId, role: 'user', approved: false })
    }
  }

  const fetchAllProfiles = async () => {
    if (profile?.role !== 'admin') return
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setAllProfiles(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchAllProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*, produto_cores(*)')
        .order('nome', { ascending: true })

      if (error) throw error
      if (data) {
        setAllProducts(data)
        localStorage.setItem('cache_all_products', JSON.stringify(data))
      }
    } catch (err) {
      const savedProducts = localStorage.getItem('cache_all_products')
      if (savedProducts) setAllProducts(JSON.parse(savedProducts))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session && profile?.approved) {
      fetchAllProducts()
    }
  }, [session, profile])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    if (isOffline) {
      const savedProfile = localStorage.getItem('cache_user_profile')
      if (savedProfile) {
        const cached = JSON.parse(savedProfile)
        if (cached.email?.toLowerCase() === email.toLowerCase()) {
          setProfile(cached)
          setSession({ user: { id: cached.id, email: cached.email } })
          return
        }
      }
      setAuthError('Modo offline: Conecte-se à internet para realizar o primeiro login.')
      return
    }

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setAuthError(error.message)
      } else {
        if (data?.user) {
          await supabase.from('profiles').upsert([
            { id: data.user.id, email: email, role: 'user', approved: false }
          ])
        }
        setAuthSuccess('Conta criada com sucesso! Aguarde a aprovação do administrador.')
        setIsRegistering(false)
        await supabase.auth.signOut()
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError('E-mail ou palavra-passe incorretos ou sem conexão.')
    }
  }

  const handleLogout = () => {
    supabase.auth.signOut()
  }

  const canViewStorePrices = profile?.role === 'admin' || profile?.role === 'loja'

  // CÁLCULO DE PREÇOS PARA ORÇAMENTO
  const getPrecoPorFormaPagamento = (prod, forma) => {
    if (!prod) return 0
    const aVista = prod.a_vista || 0
    const aPrazo = prod.a_prazo || (aVista * 1.06)

    if (!canViewStorePrices) {
      if (forma === 'a_prazo') return aPrazo
      return aVista
    }

    switch (forma) {
      case 'a_vista': return aVista
      case 'a_prazo': return aPrazo
      case 'atacado_debito': return prod.atacado_cartao_debito || (aVista * 1.03)
      case 'atacado_credito': return prod.atacado_cartao_credito || (aPrazo * 1.03)
      case 'varejo_avista': return prod.varejo_avista_debito || (aVista * 1.30)
      case 'varejo_prazo': return prod.varejo_prazo_credito || (aVista * 1.30 * 1.06)
      case 'meia_avista': return prod.meia_peca_avista_debito || (aVista * 1.15)
      case 'meia_prazo': return prod.meia_peca_prazo_credito || (aVista * 1.15 * 1.06)
      default: return aVista
    }
  }

  // ADICIONAR AO ORÇAMENTO DIRETAMENTE DO CARD / FICHA
  const handleAddDiretoDoCard = () => {
    if (!selectedProductDetails) return
    const kg = parseFloat(qtdKgOrcamento.replace(',', '.'))
    if (isNaN(kg) || kg <= 0) {
      alert('Informe uma quantidade válida em Quilos (KG).')
      return
    }

    const precoUnit = getPrecoPorFormaPagamento(selectedProductDetails, formaPagamentoOrcamento)
    const total = kg * precoUnit

    const novoItem = {
      id: Date.now(),
      produtoId: selectedProductDetails.id,
      nome: selectedProductDetails.nome,
      marca: selectedProductDetails.marca,
      cor: selectedCorOrcamento || 'Padrão',
      kg: kg,
      precoUnitario: precoUnit,
      totalItem: total
    }

    setItensOrcamento([...itensOrcamento, novoItem])
    alert('Item adicionado ao orçamento com sucesso!')
    setSelectedProductDetails(null)
    setQtdKgOrcamento('')
    setSelectedCorOrcamento('')
  }

  const handleRemoveItemOrcamento = (id) => {
    setItensOrcamento(itensOrcamento.filter(item => item.id !== id))
  }

  const totalGeralOrcamento = itensOrcamento.reduce((acc, curr) => acc + curr.totalItem, 0)
  const totalKgOrcamento = itensOrcamento.reduce((acc, curr) => acc + curr.kg, 0)

  const getNomeFormaPagamento = (forma) => {
    switch (forma) {
      case 'a_vista': return 'À Vista'
      case 'a_prazo': return 'À Prazo'
      case 'atacado_debito': return 'Atacado - Débito'
      case 'atacado_credito': return 'Atacado - Crédito'
      case 'varejo_avista': return 'Varejo - À Vista'
      case 'varejo_prazo': return 'Varejo - Prazo'
      case 'meia_avista': return 'Meia Peça - À Vista'
      case 'meia_prazo': return 'Meia Peça - Prazo'
      default: return 'À Vista'
    }
  }

  const handleExportOrcamentoPDF = async () => {
    const element = orcamentoPdfRef.current
    if (!element) return

    try {
      const { default: html2pdf } = await import('html2pdf.js')
      const namePart = clienteNome ? clienteNome.toLowerCase().replace(/\s+/g, '_') : 'cliente'
      const opt = {
        margin: 10,
        filename: `orcamento_${namePart}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      if (!window.Capacitor?.isNativePlatform?.()) {
        await html2pdf().set(opt).from(element).save()
      } else {
        const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob')
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(pdfBlob)
        })

        const { uri } = await Filesystem.writeFile({
          path: opt.filename,
          data: base64,
          directory: Directory.Cache
        })

        await Share.share({
          title: 'Orçamento Manatex/MSport',
          text: opt.filename,
          url: uri,
          dialogTitle: 'Enviar Orçamento PDF'
        })
      }

      setItensOrcamento([])
      setClienteNome('')
      setIsOrcamentoOpen(false)
    } catch (error) {
      console.error(error)
      alert('Não foi possível gerar o PDF do orçamento.')
    }
  }

  // FILTRAGEM E ORDENAÇÃO UNIFICADA
  const filteredProducts = allProducts.filter(p => {
    // 1. Filtro por marca (abas)
    if (brandFilter === 'manatex' && !p.marca?.toLowerCase().includes('manatex')) return false
    if (brandFilter === 'msport' && !p.marca?.toLowerCase().includes('msport')) return false

    // 2. Filtro por composição
    if (composicaoFilter !== 'todas' && p.composicao?.toLowerCase() !== composicaoFilter.toLowerCase()) return false

    // 3. Busca múltipla por vírgula
    if (globalSearchTerm.trim()) {
      const termos = globalSearchTerm.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
      if (termos.length > 0) {
        const nomeP = p.nome?.toLowerCase() || ''
        const compP = p.composicao?.toLowerCase() || ''
        const match = termos.some(termo => nomeP.includes(termo) || compP.includes(termo))
        if (!match) return false
      }
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'az') {
      return (a.nome || '').localeCompare(b.nome || '')
    } else if (sortBy === 'menor_preco') {
      return (a.a_vista || 0) - (b.a_vista || 0)
    } else if (sortBy === 'maior_preco') {
      return (b.a_vista || 0) - (a.a_vista || 0)
    } else if (sortBy === 'menor_gramatura') {
      return (a.gramatura || 0) - (b.gramatura || 0)
    }
    return 0
  })

  // Listas para contadores e selects
  const totalCount = allProducts.length
  const manatexCount = allProducts.filter(p => p.marca?.toLowerCase().includes('manatex')).length
  const msportCount = allProducts.filter(p => p.marca?.toLowerCase().includes('msport')).length
  const composicoesDisponiveis = [...new Set(allProducts.map(p => p.composicao).filter(Boolean))]

  const OfflineBanner = () => isOffline ? (
    <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
      <WifiOff size={16} /> Modo Offline — Exibindo dados em cache local
    </div>
  ) : null

  if (!session) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
        <OfflineBanner />
        <form onSubmit={handleAuth} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '360px', marginTop: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', color: '#059669' }}>
            {isRegistering ? <UserPlus size={40} /> : <Lock size={40} />}
            <h2 style={{ margin: '10px 0 0 0', color: '#1e293b', fontSize: '20px' }}>
              {isRegistering ? 'Criar Nova Conta' : 'Catálogo de Preços Unificado'}
            </h2>
          </div>

          {authError && <p style={{ color: 'red', fontSize: '13px', textAlign: 'center', marginBottom: '10px' }}>{authError}</p>}
          {authSuccess && <p style={{ color: '#059669', fontSize: '13px', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold' }}>{authSuccess}</p>}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Palavra-passe</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" style={{ width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}>
            {isRegistering ? 'Cadastrar' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setAuthSuccess('') }}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isRegistering ? 'Já tem uma conta? Iniciar sessão' : 'Não tem conta? Criar cadastro'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (profile && !profile.approved) {
    return (
      <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
        <OfflineBanner />
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%', marginTop: '10px' }}>
          <ShieldAlert size={48} color="#d97706" style={{ marginBottom: '15px' }} />
          <h2 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '20px' }}>Aprovação Pendente</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
            O seu cadastro foi efetuado, mas aguarda a aprovação de um administrador para aceder ao catálogo.
          </p>
          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <OfflineBanner />
      
      {/* HEADER PRINCIPAL COM CONTADORES (Inspirado na Imagem 1) */}
      <header style={{ width: '100%', maxWidth: '900px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', display: 'block' }}>{filteredProducts.length}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>produtos na consulta</span>
          </div>
          <div style={{ backgroundColor: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669', display: 'block' }}>{manatexCount}</span>
            <span style={{ fontSize: '11px', color: '#166534' }}>Manatex</span>
          </div>
          <div style={{ backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', display: 'block' }}>{msportCount}</span>
            <span style={{ fontSize: '11px', color: '#475569' }}>M Sport</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setIsOrcamentoOpen(true)} 
            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', boxShadow: '0 2px 5px rgba(37,99,235,0.3)' }}
          >
            <Calculator size={16} /> Orçamento {itensOrcamento.length > 0 && `(${itensOrcamento.length})`}
          </button>

          {profile?.role === 'admin' && (
            <>
              <button 
                onClick={() => { fetchAllProfiles(); setIsUsersModalOpen(true) }} 
                style={{ backgroundColor: '#f1f5f9', color: '#059669', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Users size={16} /> Gestão
              </button>
              <button 
                onClick={() => { setEditingId(null); setFormData({ nome: '', marca: 'manatex', a_vista: '', a_prazo: '', atacado_cartao_debito: '', atacado_cartao_credito: '', varejo_avista_debito: '', varejo_prazo_credito: '', meia_peca_avista_debito: '', meia_peca_prazo_credito: '', valor_m: '', valor_m2: '', largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: '', descricao: '', imagem_url: '', tecnologias: '', conforto_text: '', versatil_text: '' }); setFormCores([]); setIsModalOpen(true) }} 
                style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Plus size={16} /> Novo
              </button>
            </>
          )}

          <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* BARRA DE PESQUISA, ABAS DE MARCA E FILTROS (Inspirado na Imagem 1) */}
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={20} style={{ position: 'absolute', left: '15px', top: '14px', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Buscar produto ou composição (ex: Active, Cotton)..."
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '10px', border: '2px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '15px', backgroundColor: 'white' }}
          />
        </div>

        {/* BOTÕES DE FILTRO POR MARCA: TODAS - MANATEX - M SPORT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setBrandFilter('todas')}
            style={{ backgroundColor: brandFilter === 'todas' ? '#0f172a' : 'transparent', color: brandFilter === 'todas' ? 'white' : '#475569', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Todas
          </button>
          <button
            onClick={() => setBrandFilter('manatex')}
            style={{ backgroundColor: brandFilter === 'manatex' ? '#059669' : 'transparent', color: brandFilter === 'manatex' ? 'white' : '#475569', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Manatex
          </button>
          <button
            onClick={() => setBrandFilter('msport')}
            style={{ backgroundColor: brandFilter === 'msport' ? '#111827' : 'transparent', color: brandFilter === 'msport' ? 'white' : '#475569', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            M Sport
          </button>
        </div>

        {/* FILTRO DE COMPOSIÇÃO E ORDENAÇÃO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <select
            value={composicaoFilter}
            onChange={(e) => setComposicaoFilter(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '13px' }}
          >
            <option value="todas">Todas as composições</option>
            {composicoesDisponiveis.map((comp, idx) => (
              <option key={idx} value={comp}>{comp}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '13px', fontWeight: 'bold' }}
          >
            <option value="az">Nome: A → Z</option>
            <option value="menor_preco">Menor preço à vista</option>
            <option value="maior_preco">Maior preço à vista</option>
            <option value="menor_gramatura">Menor gramatura</option>
          </select>
        </div>

      </div>

      {/* LISTAGEM DOS CARDS DE PRODUTOS */}
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredProducts.map((p) => {
          const isMana = p.marca?.toLowerCase().includes('manatex')
          return (
            <div 
              key={p.id} 
              onClick={() => { setSelectedProductDetails(p); setSelectedCorOrcamento(p.produto_cores?.[0]?.nome_cor || '') }}
              style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'transform 0.1s', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>{p.nome?.toUpperCase()}</h3>
                <span style={{ backgroundColor: isMana ? '#d1fae5' : '#f1f5f9', color: isMana ? '#065f46' : '#111827', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {p.marca}
                </span>
              </div>

              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 15px 0' }}>{p.composicao || 'Composição não informada'}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px 0', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>À VISTA / KG</span>
                  <strong style={{ fontSize: '18px', color: '#059669' }}>{formatMoeda(p.a_vista)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>À PRAZO / KG</span>
                  <strong style={{ fontSize: '17px', color: '#334155' }}>{formatMoeda(p.a_prazo)}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px', fontSize: '12px', color: '#475569' }}>
                <div>Largura: <strong>{formatNumero(p.largura, ' m')}</strong></div>
                <div>Gramatura: <strong>{formatNumero(p.gramatura, ' g/m²')}</strong></div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', textAlign: 'center', color: '#059669', fontSize: '13px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                Ver ficha e montar orçamento ↗
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL / FICHA DETALHADA DO PRODUTO (Inspirado nas Imagens 2 e 3) */}
      {selectedProductDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative' }}>
            
            <button 
              onClick={() => setSelectedProductDetails(null)} 
              style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
            >
              <X size={18} />
            </button>

            <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block', marginBottom: '10px', textTransform: 'uppercase' }}>
              {selectedProductDetails.marca}
            </span>

            <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 5px 0', fontWeight: 'bold' }}>
              {selectedProductDetails.nome?.toUpperCase()}
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>{selectedProductDetails.composicao}</p>

            {/* PREÇOS EM DESTAQUE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>À vista / kg</span>
                <strong style={{ fontSize: '18px', color: '#059669' }}>{formatMoeda(selectedProductDetails.a_vista)}</strong>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '11px', color: '#475569', display: 'block' }}>À prazo / kg</span>
                <strong style={{ fontSize: '18px', color: '#334155' }}>{formatMoeda(selectedProductDetails.a_prazo)}</strong>
              </div>
            </div>

            {/* ESPECIFICAÇÕES TÉCNICAS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#334155', marginBottom: '20px', backgroundColor: '#fdf4ff', padding: '12px', borderRadius: '8px' }}>
              <div>Largura: <strong>{formatNumero(selectedProductDetails.largura, ' m')}</strong></div>
              <div>Gramatura: <strong>{formatNumero(selectedProductDetails.gramatura, ' g/m²')}</strong></div>
              <div>Rend. linear: <strong>{formatNumero(selectedProductDetails.rendimento_m, ' m/kg')}</strong></div>
              <div>Rend. área: <strong>{formatNumero(selectedProductDetails.rendimento_m2, ' m²/kg')}</strong></div>
              <div>Valor linear: <strong>{formatMoeda(selectedProductDetails.valor_m)}</strong></div>
              <div>Valor por m²: <strong>{formatMoeda(selectedProductDetails.valor_m2)}</strong></div>
            </div>

            {/* BLOCO: MONTE SEU ORÇAMENTO (Inspirado na Imagem 2) */}
            <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calculator size={16} color="#059669" /> Monte seu orçamento
              </h4>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Peso do tecido (kg)</label>
                <input
                  type="text"
                  placeholder="Ex.: 20"
                  value={qtdKgOrcamento}
                  onChange={(e) => setQtdKgOrcamento(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Pagamento do orçamento</label>
                <select
                  value={formaPagamentoOrcamento}
                  onChange={(e) => setFormaPagamentoOrcamento(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', backgroundColor: 'white' }}
                >
                  <option value="a_vista">À Vista</option>
                  <option value="a_prazo">À Prazo</option>
                  {canViewStorePrices && (
                    <>
                      <option value="atacado_debito">Atacado - Débito (+3%)</option>
                      <option value="atacado_credito">Atacado - Crédito (+3% a prazo)</option>
                      <option value="varejo_avista">Varejo - À Vista (+30%)</option>
                      <option value="varejo_prazo">Varejo - Prazo (+30% + 6%)</option>
                      <option value="meia_avista">Meia Peça - À Vista (+15%)</option>
                      <option value="meia_prazo">Meia Peça - Prazo (+15% + 6%)</option>
                    </>
                  )}
                </select>
              </div>

              {/* CORES DO TECIDO (Inspirado na Imagem 3) */}
              {selectedProductDetails.produto_cores && selectedProductDetails.produto_cores.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Selecione a cor ({selectedProductDetails.produto_cores.length} disponíveis):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {selectedProductDetails.produto_cores.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCorOrcamento(c.nome_cor)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px',
                          border: selectedCorOrcamento === c.nome_cor ? '2px solid #059669' : '1px solid #cbd5e1',
                          backgroundColor: selectedCorOrcamento === c.nome_cor ? '#f0fdf4' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '11px'
                        }}
                      >
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.codigo_hex || '#000', border: '1px solid #94a3b8' }} />
                        <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome_cor}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleAddDiretoDoCard}
                style={{ width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 5px rgba(5,150,105,0.3)' }}
              >
                Adicionar esta cor ao orçamento +
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE ORÇAMENTO GLOBAL & PDF */}
      {isOrcamentoOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator size={22} color="#2563eb" /> Carrinho de Orçamentos
              </h3>
              <button onClick={() => setIsOrcamentoOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={22} /></button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Nome do Cliente (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Confecções Silva"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            {itensOrcamento.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: '30px 0' }}>
                Nenhum produto adicionado ao orçamento. Abra a ficha de um produto para adicionar.
              </p>
            ) : (
              <>
                <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Produto</th>
                        <th style={{ padding: '8px' }}>Cor</th>
                        <th style={{ padding: '8px' }}>Qtd (KG)</th>
                        <th style={{ padding: '8px' }}>Preço/KG</th>
                        <th style={{ padding: '8px' }}>Subtotal</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensOrcamento.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.nome} <span style={{ fontSize: '10px', color: '#64748b' }}>({item.marca.toUpperCase()})</span></td>
                          <td style={{ padding: '8px', color: '#475569' }}>{item.cor}</td>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.kg.toLocaleString('pt-BR')} kg</td>
                          <td style={{ padding: '8px' }}>{formatMoeda(item.precoUnitario)}</td>
                          <td style={{ padding: '8px', fontWeight: 'bold', color: '#059669' }}>{formatMoeda(item.totalItem)}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button onClick={() => handleRemoveItemOrcamento(item.id)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>TOTAL DE PESO:</span>
                    <strong style={{ fontSize: '14px', color: '#14532d' }}>{totalKgOrcamento.toLocaleString('pt-BR')} KG</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>TOTAL DO ORÇAMENTO:</span>
                    <strong style={{ fontSize: '18px', color: '#059669' }}>{formatMoeda(totalGeralOrcamento)}</strong>
                  </div>
                </div>

                <button
                  onClick={handleExportOrcamentoPDF}
                  style={{ width: '100%', backgroundColor: '#059669', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(5,150,105,0.3)' }}
                >
                  <Send size={18} /> Exportar e Enviar Orçamento em PDF
                </button>
              </>
            )}

            {/* LAYOUT OCULTO PARA GERAÇÃO DO PDF */}
            <div style={{ display: 'none' }}>
              <div ref={orcamentoPdfRef} style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#ffffff', color: '#1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #059669', paddingBottom: '12px', marginBottom: '15px' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '22px', color: '#059669', fontWeight: 'bold' }}>ORÇAMENTO DE VENDA</h1>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Catálogo Unificado Manatex & M Sport</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                    <div>Data: {new Date().toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
                  <div><strong>Cliente:</strong> {clienteNome || 'Cliente Não Informado'}</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '15px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#059669', color: 'white', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Item / Tecido</th>
                      <th style={{ padding: '6px 8px' }}>Cor</th>
                      <th style={{ padding: '6px 8px' }}>Qtd (KG)</th>
                      <th style={{ padding: '6px 8px' }}>Preço/KG</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensOrcamento.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{item.nome} ({item.marca.toUpperCase()})</td>
                        <td style={{ padding: '6px 8px' }}>{item.cor}</td>
                        <td style={{ padding: '6px 8px' }}>{item.kg.toLocaleString('pt-BR')} kg</td>
                        <td style={{ padding: '6px 8px' }}>{formatMoeda(item.precoUnitario)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoeda(item.totalItem)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 15px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px' }}><strong>Total de Peso:</strong> {totalKgOrcamento.toLocaleString('pt-BR')} KG</div>
                  <div style={{ fontSize: '16px', color: '#059669', fontWeight: 'bold' }}>VALOR TOTAL: {formatMoeda(totalGeralOrcamento)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO DE USUÁRIOS (ADMIN) */}
      {isUsersModalOpen && profile?.role === 'admin' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Gestão de Acessos</h3>
              <button onClick={() => setIsUsersModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>E-mail</th>
                  <th style={{ padding: '8px' }}>Estado</th>
                  <th style={{ padding: '8px' }}>Permissão</th>
                </tr>
              </thead>
              <tbody>
                {allProfiles.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px' }}>{u.email}</td>
                    <td style={{ padding: '8px' }}>{u.approved ? 'Aprovado' : 'Pendente'}</td>
                    <td style={{ padding: '8px' }}>{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
