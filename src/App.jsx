import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Search, Plus, Edit2, Trash2, X, LogOut, Lock, ArrowLeft, Image as ImageIcon, Palette, Sparkles, ShieldAlert, UserPlus, Users, Download, WifiOff, FileText, Calculator, Send, Check } from 'lucide-react'

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

  // GESTÃO DE USUÁRIOS (ADMIN)
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false)
  const [allProfiles, setAllProfiles] = useState([])

  // FICHA DO PRODUTO SELECIONADA
  const [selectedProductDetails, setSelectedProductDetails] = useState(null)
  const [selectedCorOrcamento, setSelectedCorOrcamento] = useState('')
  const [selectedCorImagemUrl, setSelectedCorImagemUrl] = useState('')
  const [qtdKgOrcamento, setQtdKgOrcamento] = useState('')
  const [formaPagamentoOrcamento, setFormaPagamentoOrcamento] = useState('a_vista')
  
  // TELA DE ORÇAMENTO (CARRINHO)
  const [isOrcamentoOpen, setIsOrcamentoOpen] = useState(false)
  const [clienteNome, setClienteNome] = useState('')
  const [representanteNome, setRepresentanteNome] = useState('')
  const [formaPagamentoGeral, setFormaPagamentoGeral] = useState('a_vista')
  const [observacoesOrcamento, setObservacoesOrcamento] = useState('')
  const [itensOrcamento, setItensOrcamento] = useState([])
  const orcamentoPdfRef = useRef(null)

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

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      fetchAllProfiles()
    } catch (err) {
      alert('Erro ao atualizar permissão.')
    }
  }

  const handleToggleApprove = async (userId, currentStatus) => {
    try {
      await supabase.from('profiles').update({ approved: !currentStatus }).eq('id', userId)
      fetchAllProfiles()
    } catch (err) {
      alert('Erro ao alterar status de aprovação.')
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
      cor: selectedCorOrcamento || '',
      kg: kg,
      formaPagamento: formaPagamentoOrcamento,
      precoUnitario: precoUnit,
      produtoRef: selectedProductDetails
    }

    setItensOrcamento([...itensOrcamento, novoItem])
    setSelectedProductDetails(null)
    setQtdKgOrcamento('')
    setSelectedCorOrcamento('')
    setSelectedCorImagemUrl('')
    setIsOrcamentoOpen(true)
  }

  const handleUpdateItemKg = (id, novoKgStr) => {
    const kg = parseFloat(novoKgStr.replace(',', '.'))
    setItensOrcamento(itensOrcamento.map(item => {
      if (item.id === id) {
        const valKg = isNaN(kg) ? 0 : kg
        return { ...item, kg: novoKgStr, totalItem: valKg * item.precoUnitario }
      }
      return item
    }))
  }

  const handleUpdateItemCor = (id, novaCor) => {
    setItensOrcamento(itensOrcamento.map(item => {
      if (item.id === id) {
        return { ...item, cor: novaCor }
      }
      return item
    }))
  }

  const handleUpdateAllPagamento = (novaForma) => {
    setFormaPagamentoGeral(novaForma)
    setItensOrcamento(itensOrcamento.map(item => {
      const precoUnit = getPrecoPorFormaPagamento(item.produtoRef, novaForma)
      const numKg = parseFloat(item.kg.toString().replace(',', '.')) || 0
      return {
        ...item,
        formaPagamento: novaForma,
        precoUnitario: precoUnit,
        totalItem: numKg * precoUnit
      }
    }))
  }

  const handleRemoveItemOrcamento = (id) => {
    setItensOrcamento(itensOrcamento.filter(item => item.id !== id))
  }

  const totalKgOrcamento = itensOrcamento.reduce((acc, curr) => acc + (parseFloat(curr.kg.toString().replace(',', '.')) || 0), 0)
  const totalGeralOrcamento = itensOrcamento.reduce((acc, curr) => acc + ((parseFloat(curr.kg.toString().replace(',', '.')) || 0) * curr.precoUnitario), 0)

  const getNomeFormaPagamento = (forma) => {
    switch (forma) {
      case 'a_vista': return 'À vista'
      case 'a_prazo': return 'À prazo'
      case 'atacado_debito': return 'Atacado - Débito'
      case 'atacado_credito': return 'Atacado - Crédito'
      case 'varejo_avista': return 'Varejo - À Vista'
      case 'varejo_prazo': return 'Varejo - Prazo'
      case 'meia_avista': return 'Meia Peça - À Vista'
      case 'meia_prazo': return 'Meia Peça - Prazo'
      default: return 'À vista'
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
      setRepresentanteNome('')
      setObservacoesOrcamento('')
      setIsOrcamentoOpen(false)
    } catch (error) {
      console.error(error)
      alert('Não foi possível gerar o PDF do orçamento.')
    }
  }

  const filteredProducts = allProducts.filter(p => {
    if (brandFilter === 'manatex' && !p.marca?.toLowerCase().includes('manatex')) return false
    if (brandFilter === 'msport' && !p.marca?.toLowerCase().includes('msport')) return false
    if (composicaoFilter !== 'todas' && p.composicao?.toLowerCase() !== composicaoFilter.toLowerCase()) return false

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
              {isRegistering ? 'Criar Nova Conta' : 'Catálogo Unificado'}
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

      {/* LOGOS OFICIAIS DAS MARCAS LADO A LADO NO TOPO */}
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <img 
          src="https://manatexb2b.vtexassets.com/assets/vtex/assets-builder/manatexb2b.theme/0.0.107/logo/logo-manatex___9f9967acd4c31ae81563d1b029c0102d.png" 
          alt="Manatex" 
          style={{ height: '35px', objectFit: 'contain' }} 
        />
        <div style={{ width: '1px', height: '28px', backgroundColor: '#cbd5e1' }} />
        <img 
          src="https://manatexb2b.vtexassets.com/assets/vtex.files-provider/images/1cfec8ac-6368-450f-a9cb-b265ac8c9740___73510c07b9f578ce5173e8880190edd0.png" 
          alt="M Sport" 
          style={{ height: '35px', objectFit: 'contain' }} 
        />
      </div>
      
      {/* HEADER PRINCIPAL */}
      <header style={{ width: '100%', maxWidth: '900px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', display: 'block' }}>{filteredProducts.length}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>produtos</span>
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
            style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', boxShadow: '0 2px 5px rgba(5,150,105,0.3)' }}
          >
            <Calculator size={16} /> Orçamento {itensOrcamento.length > 0 && `(${itensOrcamento.length})`}
          </button>

          {profile?.role === 'admin' && (
            <>
              <button 
                onClick={() => { fetchAllProfiles(); setIsUsersModalOpen(true) }} 
                style={{ backgroundColor: '#f1f5f9', color: '#059669', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Users size={16} /> Usuários
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

      {/* FILTROS E PESQUISA */}
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={20} style={{ position: 'absolute', left: '15px', top: '14px', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Buscar por produto ou composição (ex: Active, Cotton)..."
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '10px', border: '2px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '15px', backgroundColor: 'white' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setBrandFilter('todas')}
            style={{ backgroundColor: brandFilter === 'todas' ? '#0f172a' : 'transparent', color: brandFilter === 'todas' ? 'white' : '#475569', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            Todas
          </button>
          <button
            onClick={() => setBrandFilter('manatex')}
            style={{ backgroundColor: brandFilter === 'manatex' ? '#059669' : 'transparent', color: brandFilter === 'manatex' ? 'white' : '#475569', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            Manatex
          </button>
          <button
            onClick={() => setBrandFilter('msport')}
            style={{ backgroundColor: brandFilter === 'msport' ? '#111827' : 'transparent', color: brandFilter === 'msport' ? 'white' : '#475569', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            M Sport
          </button>
        </div>

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

      {/* LISTAGEM DOS CARDS */}
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredProducts.map((p) => {
          const isMana = p.marca?.toLowerCase().includes('manatex')
          return (
            <div 
              key={p.id} 
              onClick={() => {
                setSelectedProductDetails(p)
                setSelectedCorOrcamento(p.produto_cores?.[0]?.nome_cor || '')
                setSelectedCorImagemUrl(p.produto_cores?.[0]?.imagem_url || p.imagem_url || '')
              }}
              style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>{p.nome?.toUpperCase()}</h3>
                <span style={{ backgroundColor: isMana ? '#d1fae5' : '#f1f5f9', color: isMana ? '#065f46' : '#111827', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {p.marca}
                </span>
              </div>

              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 12px 0' }}>{p.composicao || 'Composição não informada'}</p>

              {p.imagem_url && (
                <div style={{ textAlign: 'center', margin: '12px 0', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <img src={p.imagem_url} alt={p.nome} style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }} />
                </div>
              )}

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

      {/* MODAL / FICHA DETALHADA DO PRODUTO */}
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

            {(selectedCorImagemUrl || selectedProductDetails.imagem_url) && (
              <div style={{ textAlign: 'center', marginBottom: '15px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <img 
                  src={selectedCorImagemUrl || selectedProductDetails.imagem_url} 
                  alt={selectedProductDetails.nome} 
                  style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} 
                />
                {selectedCorOrcamento && (
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#059669', marginTop: '6px' }}>
                    Cor selecionada: {selectedCorOrcamento}
                  </span>
                )}
              </div>
            )}

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

            {canViewStorePrices && (
              <div style={{ backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', padding: '12px', borderRadius: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9d174d', display: 'block', marginBottom: '8px' }}>
                  Tabela de Preços da Loja Interna:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11px', color: '#831843' }}>
                  <div>Atacado Débito (+3%): <strong>{formatMoeda(selectedProductDetails.atacado_cartao_debito || selectedProductDetails.a_vista * 1.03)}</strong></div>
                  <div>Atacado Crédito (+3% pr): <strong>{formatMoeda(selectedProductDetails.atacado_cartao_credito || selectedProductDetails.a_prazo * 1.03)}</strong></div>
                  <div>Varejo À Vista (+30%): <strong>{formatMoeda(selectedProductDetails.varejo_avista_debito || selectedProductDetails.a_vista * 1.30)}</strong></div>
                  <div>Varejo Prazo (+30%+6%): <strong>{formatMoeda(selectedProductDetails.varejo_prazo_credito || selectedProductDetails.a_vista * 1.30 * 1.06)}</strong></div>
                  <div>Meia Peça À Vista (+15%): <strong>{formatMoeda(selectedProductDetails.meia_peca_avista_debito || selectedProductDetails.a_vista * 1.15)}</strong></div>
                  <div>Meia Peça Prazo (+15%+6%): <strong>{formatMoeda(selectedProductDetails.meia_peca_prazo_credito || selectedProductDetails.a_vista * 1.15 * 1.06)}</strong></div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#334155', marginBottom: '20px', backgroundColor: '#fdf4ff', padding: '12px', borderRadius: '8px' }}>
              <div>Largura: <strong>{formatNumero(selectedProductDetails.largura, ' m')}</strong></div>
              <div>Gramatura: <strong>{formatNumero(selectedProductDetails.gramatura, ' g/m²')}</strong></div>
              <div>Rend. linear: <strong>{formatNumero(selectedProductDetails.rendimento_m, ' m/kg')}</strong></div>
              <div>Rend. área: <strong>{formatNumero(selectedProductDetails.rendimento_m2, ' m²/kg')}</strong></div>
              <div>Valor linear: <strong>{formatMoeda(selectedProductDetails.valor_m)}</strong></div>
              <div>Valor por m²: <strong>{formatMoeda(selectedProductDetails.valor_m2)}</strong></div>
            </div>

            {selectedProductDetails.produto_cores && selectedProductDetails.produto_cores.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Cores do tecido ({selectedProductDetails.produto_cores.length} disponíveis):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {selectedProductDetails.produto_cores.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCorOrcamento(c.nome_cor)
                        setSelectedCorImagemUrl(c.imagem_url || selectedProductDetails.imagem_url || '')
                      }}
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

      {/* TELA DE ORÇAMENTO (CARRINHO EXATAMENTE IGUAL ÀS IMAGENS RECENTES) */}
      {isOrcamentoOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', position: 'relative' }}>
            
            <button 
              onClick={() => setIsOrcamentoOpen(false)} 
              style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
            >
              <X size={18} />
            </button>

            <span style={{ fontSize: '10px', fontWeight: '800', color: '#166534', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              CONSULTA COMERCIAL
            </span>
            <h2 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 8px 0', fontWeight: 'bold' }}>
              Seu orçamento
            </h2>
            <p style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.4', marginBottom: '20px' }}>
              Adicione tecidos e cores diferentes. Cada cor aparece como um item com seu próprio peso.
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Cliente (opcional)</label>
              <input
                type="text"
                placeholder="Nome ou razão social"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', backgroundColor: 'white' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Representante (opcional)</label>
              <input
                type="text"
                placeholder="Seu nome"
                value={representanteNome}
                onChange={(e) => setRepresentanteNome(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', backgroundColor: 'white' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Pagamento de todos os itens</label>
              <select
                value={formaPagamentoGeral}
                onChange={(e) => handleUpdateAllPagamento(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', backgroundColor: 'white' }}
              >
                <option value="a_vista">À vista</option>
                <option value="a_prazo">À prazo</option>
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

            {/* LISTAGEM DE ITENS EM CARDS INDIVIDUAIS */}
            {itensOrcamento.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: '20px 0' }}>
                Nenhum produto no orçamento.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                {itensOrcamento.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '15px', backgroundColor: 'white', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '16px', color: '#0f172a' }}>{item.nome?.toUpperCase()}</strong>
                      <button onClick={() => handleRemoveItemOrcamento(item.id)} style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Remover
                      </button>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0' }}>
                      {item.marca?.toUpperCase()} • {formatMoeda(item.precoUnitario)}/kg
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '3px' }}>Cor</label>
                        <input
                          type="text"
                          placeholder="Digite qualquer cor"
                          value={item.cor}
                          onChange={(e) => handleUpdateItemCor(item.id, e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: 'white' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#475569', marginBottom: '3px' }}>Peso (kg)</label>
                        <input
                          type="text"
                          placeholder="Ex: 15"
                          value={item.kg}
                          onChange={(e) => handleUpdateItemKg(item.id, e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: 'white', fontWeight: 'bold' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>Subtotal</span>
                      <strong style={{ color: '#059669', fontSize: '15px' }}>{formatMoeda(item.totalItem)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CAIXA DE TOTAL DO ORÇAMENTO */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#166534', display: 'block' }}>Total do orçamento</span>
                <span style={{ fontSize: '11px', color: '#166534' }}>{totalKgOrcamento.toLocaleString('pt-BR')} kg • {itensOrcamento.length} {itensOrcamento.length === 1 ? 'item' : 'itens'}</span>
              </div>
              <strong style={{ fontSize: '22px', color: '#059669' }}>{formatMoeda(totalGeralOrcamento)}</strong>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Observações (opcional)</label>
              <textarea
                placeholder="Informações adicionais do orçamento"
                value={observacoesOrcamento}
                onChange={(e) => setObservacoesOrcamento(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: 'white', resize: 'vertical' }}
              />
            </div>

            <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', marginBottom: '20px' }}>
              Adicione quantas cores quiser deste produto, informando um peso para cada cor. A cartela traz sugestões; você também pode digitar outras cores, sujeitas à confirmação comercial.<br/><br/>
              Frete, estoque, entrega e validade a confirmar. Cálculo com preço/kg arredondado a duas casas decimais.
            </p>

            <button
              onClick={handleExportOrcamentoPDF}
              style={{ width: '100%', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', boxShadow: '0 4px 10px rgba(15,23,42,0.2)' }}
            >
              Gerar orçamento completo em PDF ↓
            </button>

            <button
              onClick={() => setIsOrcamentoOpen(false)}
              style={{ width: '100%', backgroundColor: 'white', color: '#059669', border: '1px solid #059669', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              Adicionar mais produtos
            </button>

            {/* LAYOUT PARA GERAÇÃO DO PDF */}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
                  <div><strong>Cliente:</strong> {clienteNome || 'Cliente Não Informado'}</div>
                  <div><strong>Representante:</strong> {representanteNome || 'Não Informado'}</div>
                  <div style={{ gridColumn: 'span 2' }}><strong>Condição de Pagamento:</strong> {getNomeFormaPagamento(formaPagamentoGeral)}</div>
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
                        <td style={{ padding: '6px 8px' }}>{item.cor || 'Padrão'}</td>
                        <td style={{ padding: '6px 8px' }}>{item.kg} kg</td>
                        <td style={{ padding: '6px 8px' }}>{formatMoeda(item.precoUnitario)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoeda(item.totalItem)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {observacoesOrcamento && (
                  <div style={{ marginBottom: '15px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '11px' }}>
                    <strong>Observações:</strong> {observacoesOrcamento}
                  </div>
                )}

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
              <h3 style={{ margin: 0, fontSize: '18px' }}>Gestão de Acessos e Permissões</h3>
              <button onClick={() => setIsUsersModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>E-mail</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Nível de Permissão</th>
                </tr>
              </thead>
              <tbody>
                {allProfiles.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px' }}>{u.email}</td>
                    <td style={{ padding: '8px' }}>
                      <button
                        onClick={() => handleToggleApprove(u.id, u.approved)}
                        style={{ backgroundColor: u.approved ? '#d1fae5' : '#fee2e2', color: u.approved ? '#065f46' : '#991b1b', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                      >
                        {u.approved ? 'Aprovado' : 'Aprovar Accesso'}
                      </button>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      >
                        <option value="user">Representante (Padrão)</option>
                        <option value="loja">Loja (Ver 6 Preços)</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
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
