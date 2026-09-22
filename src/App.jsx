import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Search, Plus, Edit2, Trash2, X, LogOut, Lock, ArrowLeft, Image as ImageIcon, Palette, Sparkles } from 'lucide-react'

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
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [selectedBrand, setSelectedBrand] = useState(null)
  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Mapeamento da cor/imagem selecionada por produto
  const [selectedColorsMap, setSelectedColorsMap] = useState({})

  const [formData, setFormData] = useState({
    nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '',
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
      if (data) setProfile(data)
      else setProfile({ id: userId, role: 'user', approved: true })
    } catch (err) {
      console.error(err)
    }
  }

  const fetchProducts = async () => {
    if (!selectedBrand) return
    setLoading(true)
    const { data } = await supabase
      .from('produtos')
      .select('*, produto_cores(*)')
      .eq('marca', selectedBrand)
      .order('id', { ascending: true })

    setProducts(data || [])
    setLoading(false)
  }

  const fetchAllProducts = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('*, produto_cores(*)')
      .order('nome', { ascending: true })

    setAllProducts(data || [])
  }

  useEffect(() => {
    if (session && profile?.approved) {
      fetchAllProducts()
      if (selectedBrand) fetchProducts()
    }
  }, [session, profile, selectedBrand])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError('E-mail ou palavra-passe incorretos.')
  }

  const handleLogout = () => {
    setSelectedBrand(null)
    supabase.auth.signOut()
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()

    const { aPrazo, valorM, valorM2 } = recalcularValores(formData.a_vista, formData.rendimento_m, formData.rendimento_m2)

    const payload = {
      nome: formData.nome,
      marca: selectedBrand || 'manatex',
      a_vista: parseInputValue(formData.a_vista),
      a_prazo: parseInputValue(formData.a_prazo || aPrazo),
      valor_m: parseInputValue(formData.valor_m || valorM),
      valor_m2: parseInputValue(formData.valor_m2 || valorM2),
      largura: parseInputValue(formData.largura),
      gramatura: parseInputValue(formData.gramatura),
      rendimento_m: parseInputValue(formData.rendimento_m),
      rendimento_m2: parseInputValue(formData.rendimento_m2),
      composicao: formData.composicao,
      descricao: formData.descricao,
      imagem_url: formData.imagem_url ? formData.imagem_url.trim() : null,
      tecnologias: formData.tecnologias,
      conforto_text: formData.conforto_text,
      versatil_text: formData.versatil_text
    }

    try {
      let productId = editingId
      let error = null

      if (editingId) {
        const { error: updateError } = await supabase
          .from('produtos')
          .update(payload)
          .eq('id', editingId)
        
        error = updateError
      } else {
        const { data, error: insertError } = await supabase
          .from('produtos')
          .insert([payload])
          .select()

        error = insertError
        if (data && data[0]) productId = data[0].id
      }

      if (error) {
        console.error('Erro Supabase:', error)
        alert(`Erro ao salvar produto: ${error.message}`)
        return
      }

      if (productId) {
        await supabase.from('produto_cores').delete().eq('produto_id', productId)

        if (formCores.length > 0) {
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
      }

      closeModal()
      fetchProducts()
      fetchAllProducts()
    } catch (err) {
      console.error('Erro:', err)
      alert('Ocorreu um erro ao guardar.')
    }
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
    p.composicao?.toLowerCase().includes(globalSearchTerm.toLowerCase())
  )

  const isManatex = selectedBrand === 'manatex'
  const brandColor = isManatex ? '#059669' : '#111827'

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

  // TELA DE SELEÇÃO DE MARCA / BUSCA GLOBAL DE CARDS
  if (!selectedBrand) {
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
          <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredGlobalProducts.map((p) => {
              const selectedColorObj = selectedColorsMap[p.id]
              const currentImage = selectedColorObj?.imagem_url || p.imagem_url
              const selectedColorName = selectedColorObj?.nome_cor ? ` - ${selectedColorObj.nome_cor.toUpperCase()}` : ''

              return (
                <div key={p.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '18px', right: '18px', backgroundColor: p.marca === 'manatex' ? '#d1fae5' : '#f3f4f6', color: p.marca === 'manatex' ? '#065f46' : '#111827', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {p.marca}
                  </span>

                  <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', margin: '0 0 8px 0', color: '#0f172a', fontWeight: 'bold' }}>
                      {p.nome?.toUpperCase()}{selectedColorName}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{p.descricao}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '15px 0' }}>
                    {currentImage ? (
                      <img src={currentImage} alt={p.nome} style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ width: '120px', height: '90px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <ImageIcon size={28} />
                      </div>
                    )}

                    {p.produto_cores && p.produto_cores.length > 0 && (
                      <div style={{ marginTop: '15px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px' }}>CORES DISPONÍVEIS:</span>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {p.produto_cores.map((cor) => (
                            <button
                              key={cor.id}
                              onClick={() => setSelectedColorsMap({ ...selectedColorsMap, [p.id]: cor })}
                              title={cor.nome_cor}
                              style={{ 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                backgroundColor: cor.codigo_hex || '#000', 
                                border: selectedColorObj?.id === cor.id ? '3px solid #059669' : '2px solid white', 
                                boxShadow: '0 0 0 1px #cbd5e1', 
                                cursor: 'pointer' 
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {(p.tecnologias || p.conforto_text || p.versatil_text) && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 15px', margin: '15px 0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', marginBottom: '6px' }}>
                        <Sparkles size={14} /> Características e Tecnologias
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#14532d' }}>
                        {p.tecnologias && <div><strong>Tecnologias:</strong> {p.tecnologias}</div>}
                        {p.conforto_text && <div><strong>Conforto:</strong> {p.conforto_text}</div>}
                        {p.versatil_text && <div><strong>Versatilidade:</strong> {p.versatil_text}</div>}
                      </div>
                    </div>
                  )}

                  <div style={{ border: '1.5px solid #c8d0f8', borderRadius: '12px', padding: '10px 15px', margin: '15px 0', backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e7ff', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Composição</span>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{p.composicao || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e7ff', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Gramatura</span>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{formatNumero(p.gramatura, 'g')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Largura</span>
                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{formatNumero(p.largura, 'm')}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>À Vista</span>
                      <strong style={{ fontSize: '14px', color: '#059669' }}>{formatMoeda(p.a_vista)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>À Prazo (+6%)</span>
                      <strong style={{ fontSize: '13px', color: '#334155' }}>{formatMoeda(p.a_prazo)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Rend. M/KG</span>
                      <strong style={{ fontSize: '13px', color: '#334155' }}>{formatNumero(p.rendimento_m, 'm')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Rend. M²/KG</span>
                      <strong style={{ fontSize: '13px', color: '#334155' }}>{formatNumero(p.rendimento_m2, 'm²')}</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '900px' }}>
            <div onClick={() => setSelectedBrand('manatex')} style={{ flex: '1 1 260px', backgroundColor: 'white', border: '2px solid #059669', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
              <img src="/mana.jpg" alt="Manatex" style={{ maxHeight: '50px', marginBottom: '10px' }} />
              <p style={{ color: '#64748b', margin: 0 }}>Tabela de produtos Manatex</p>
            </div>
            <div onClick={() => setSelectedBrand('msports')} style={{ flex: '1 1 260px', backgroundColor: '#111827', border: '2px solid #111827', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
              <img src="/msports.jpg" alt="MSports" style={{ maxHeight: '50px', marginBottom: '10px', backgroundColor: 'white', padding: '4px' }} />
              <p style={{ color: '#9ca3af', margin: 0 }}>Tabela de produtos MSports</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // TELA DA MARCA (TABELA EM DESKTOP + CARDS EM MOBILE)
  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '10px' }}>
      
      {/* CSS RESPONSIVO INJETADO PARA DAR SWITCH ENTRE CARTÕES E TABELA */}
      <style>{`
        .product-cards-mobile {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .product-table-desktop {
          display: none;
        }
        @media (min-width: 768px) {
          .product-cards-mobile {
            display: none;
          }
          .product-table-desktop {
            display: block;
          }
        }
      `}</style>

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

      {/* CAMPO DE PESQUISA DENTRO DA MARCA */}
      <div style={{ marginBottom: '15px', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Filtrar por tecido ou composição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '8px 12px 8px 38px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* VISUALIZAÇÃO EM CARTÕES (EXCLUSIVO PARA TELEMÓVEL / ECAN PEQUENO) */}
      <div className="product-cards-mobile">
        {filteredProducts.map((p) => (
          <div key={p.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'relative' }}>
            
            {/* CABEÇALHO DO CARD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>{p.nome}</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>{p.composicao || 'Composição não informada'}</p>
              </div>
              {profile?.role === 'admin' && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openModal(p)} style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* CORES */}
            {p.produto_cores && p.produto_cores.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginRight: '4px' }}>Cores:</span>
                {p.produto_cores.map((c) => (
                  <span key={c.id} title={c.nome_cor} style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.codigo_hex, border: '1px solid #cbd5e1', display: 'inline-block' }} />
                ))}
              </div>
            )}

            {/* PREÇOS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>À Vista</span>
                <strong style={{ fontSize: '15px', color: '#059669' }}>{formatMoeda(p.a_vista)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>À Prazo (+6%)</span>
                <strong style={{ fontSize: '13px', color: '#334155' }}>{formatMoeda(p.a_prazo)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Valor / M</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>{formatMoeda(p.valor_m)}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Valor / M²</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>{formatMoeda(p.valor_m2)}</span>
              </div>
            </div>

            {/* ESPECIFICAÇÕES TÉCNICAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center', fontSize: '11px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>Rend. M</span>
                <strong style={{ color: '#334155' }}>{formatNumero(p.rendimento_m, 'm')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>Rend. M²</span>
                <strong style={{ color: '#334155' }}>{formatNumero(p.rendimento_m2, 'm²')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>Gramatura</span>
                <strong style={{ color: '#334155' }}>{formatNumero(p.gramatura, 'g')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>Largura</span>
                <strong style={{ color: '#334155' }}>{formatNumero(p.largura, 'm')}</strong>
              </div>
            </div>

            {/* TECNOLOGIAS */}
            {p.tecnologias && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px', fontSize: '11px', color: '#166534' }}>
                <strong>Tecnologias:</strong> {p.tecnologias}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* VISUALIZAÇÃO EM TABELA (EXCLUSIVO PARA DESKTOP) */}
      <div className="product-table-desktop" style={{ backgroundColor: 'white', borderRadius: '8px', overflowX: 'auto', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: brandColor, color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Produto</th>
              <th style={{ padding: '10px' }}>Cores</th>
              <th style={{ padding: '10px' }}>À Vista</th>
              <th style={{ padding: '10px' }}>À Prazo (+6%)</th>
              <th style={{ padding: '10px' }}>Valor M</th>
              <th style={{ padding: '10px' }}>Valor M²</th>
              <th style={{ padding: '10px' }}>Rend. M</th>
              <th style={{ padding: '10px' }}>Rend. M²</th>
              <th style={{ padding: '10px' }}>Gramatura</th>
              <th style={{ padding: '10px' }}>Largura</th>
              <th style={{ padding: '10px' }}>Composição</th>
              <th style={{ padding: '10px' }}>Tecnologias</th>
              {profile?.role === 'admin' && <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>{p.nome}</td>
                <td style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', maxWidth: '60px' }}>
                    {p.produto_cores?.map((c) => (
                      <span key={c.id} title={c.nome_cor} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.codigo_hex, border: '1px solid #cbd5e1', display: 'inline-block' }} />
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px', color: '#059669', fontWeight: 'bold' }}>{formatMoeda(p.a_vista)}</td>
                <td style={{ padding: '10px', color: '#334155' }}>{formatMoeda(p.a_prazo)}</td>
                <td style={{ padding: '10px', color: '#334155' }}>{formatMoeda(p.valor_m)}</td>
                <td style={{ padding: '10px', color: '#334155' }}>{formatMoeda(p.valor_m2)}</td>
                <td style={{ padding: '10px', color: '#334155' }}>{formatNumero(p.rendimento_m, 'm')}</td>
                <td style={{ padding: '10px', color: '#334155' }}>{formatNumero(p.rendimento_m2, 'm²')}</td>
                <td style={{ padding: '10px', color: '#334155' }}>{formatNumero(p.gramatura, 'g')}</td>
                <td style={{ padding: '10px', color: '#334155' }}>{formatNumero(p.largura, 'm')}</td>
                <td style={{ padding: '10px', color: '#64748b' }}>{p.composicao || '-'}</td>
                <td style={{ padding: '10px', color: '#047857', fontWeight: 'bold' }}>{p.tecnologias || '-'}</td>
                {profile?.role === 'admin' && (
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button onClick={() => openModal(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', padding: '2px' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', marginLeft: '6px', padding: '2px' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL COMPLETO DE EDIÇÃO */}
      {isModalOpen && profile?.role === 'admin' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '10px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={closeModal} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Nome do Produto</label>
                <input type="text" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="Ex: AERODRY" />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Foto Principal (URL)</label>
                  <input type="text" value={formData.imagem_url} onChange={e => setFormData({...formData, imagem_url: e.target.value})} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="https://..." />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>À Vista (R$)</label>
                  <input type="text" value={formData.a_vista} onChange={handleAVistaChange} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="0,00" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Rendimento M (m)</label>
                  <input type="text" value={formData.rendimento_m} onChange={handleRendimentoMChange} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="0,00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Rendimento M² (m²)</label>
                  <input type="text" value={formData.rendimento_m2} onChange={handleRendimentoM2Change} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="0,00" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Largura (m)</label>
                  <input type="text" value={formData.largura} onChange={e => setFormData({...formData, largura: e.target.value})} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="1,60" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Gramatura (g)</label>
                  <input type="text" value={formData.gramatura} onChange={e => setFormData({...formData, gramatura: e.target.value})} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="135" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold' }}>Composição</label>
                <input type="text" value={formData.composicao} onChange={e => setFormData({...formData, composicao: e.target.value})} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} placeholder="100% Poliéster" />
              </div>

              <div style={{ border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px', backgroundColor: '#f0fdf4' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', display: 'block', marginBottom: '8px' }}>
                  Atributos e Tecnologias do Produto
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#14532d' }}>Tecnologias (ex: UV 50+, Dry, Anti-pilling)</label>
                    <input type="text" value={formData.tecnologias} onChange={e => setFormData({...formData, tecnologias: e.target.value})} style={{ width: '100%', padding: '5px', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#14532d' }}>Conforto (ex: Toque macio e leve)</label>
                    <input type="text" value={formData.conforto_text} onChange={e => setFormData({...formData, conforto_text: e.target.value})} style={{ width: '100%', padding: '5px', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#14532d' }}>Versatilidade / Uso Recomendado (ex: Ideal para moda fitness)</label>
                    <input type="text" value={formData.versatil_text} onChange={e => setFormData({...formData, versatil_text: e.target.value})} style={{ width: '100%', padding: '5px', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Palette size={14} /> Cores e Variantes
                  </span>
                  <button type="button" onClick={addCorField} style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                    + Cor
                  </button>
                </div>

                {formCores.map((cor, index) => (
                  <div key={index} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                    <input
                      type="text"
                      placeholder="Nome cor"
                      value={cor.nome_cor}
                      onChange={(e) => handleCorChange(index, 'nome_cor', e.target.value)}
                      style={{ flex: '2', padding: '4px', fontSize: '11px' }}
                    />
                    <input
                      type="color"
                      value={cor.codigo_hex || '#000000'}
                      onChange={(e) => handleCorChange(index, 'codigo_hex', e.target.value)}
                      style={{ width: '30px', height: '26px', padding: 0, border: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      placeholder="URL Foto da cor"
                      value={cor.imagem_url}
                      onChange={(e) => handleCorChange(index, 'imagem_url', e.target.value)}
                      style={{ flex: '3', padding: '4px', fontSize: '11px' }}
                    />
                    <button type="button" onClick={() => removeCorField(index)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="submit" style={{ backgroundColor: brandColor, color: 'white', border: 'none', padding: '8px', borderRadius: '5px', fontWeight: 'bold', marginTop: '8px', cursor: 'pointer' }}>
                {editingId ? 'Atualizar Produto' : 'Cadastrar Produto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
