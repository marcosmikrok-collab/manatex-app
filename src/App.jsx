import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Search, Plus, Edit2, Trash2, Package, X } from 'lucide-react'

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState({
    nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '',
    largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: ''
  })

  // Buscar produtos do Supabase
  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Erro ao buscar produtos:', error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Salvar ou Atualizar produto
  const handleSaveProduct = async (e) => {
    e.preventDefault()
    const payload = {
      nome: formData.nome,
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

  // Deletar produto
  const handleDelete = async (id) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      await supabase.from('produtos').delete().eq('id', id)
      fetchProducts()
    }
  }

  // Abrir Modal
  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id)
      setFormData({
        nome: product.nome || '',
        a_vista: product.a_vista || '',
        a_prazo: product.a_prazo || '',
        valor_m: product.valor_m || '',
        valor_m2: product.valor_m2 || '',
        largura: product.largura || '',
        gramatura: product.gramatura || '',
        rendimento_m: product.rendimento_m || '',
        rendimento_m2: product.rendimento_m2 || '',
        composicao: product.composicao || ''
      })
    } else {
      setEditingId(null)
      setFormData({
        nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '',
        largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  // Filtrar busca
  const filteredProducts = products.filter(p =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.composicao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '20px' }}>
      
      {/* Cabeçalho */}
      <header style={{ backgroundColor: '#059669', color: 'white', padding: '15px 20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Package size={28} />
          <h1 style={{ margin: 0, fontSize: '24px' }}>Manatex - Tabela de Preços</h1>
        </div>
        <button 
          onClick={() => openModal()}
          style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Plus size={18} /> Novo Produto
        </button>
      </header>

      {/* Busca */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }} />
          <input
            type="text"
            placeholder="Buscar por produto ou composição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Tabela de Produtos */}
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
                <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.nome}</td>
                  <td style={{ padding: '12px', color: '#059669', fontWeight: 'bold' }}>R$ {Number(p.a_vista || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>R$ {Number(p.a_prazo || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>R$ {Number(p.valor_m || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>R$ {Number(p.valor_m2 || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>{p.largura}m</td>
                  <td style={{ padding: '12px' }}>{p.gramatura}g</td>
                  <td style={{ padding: '12px' }}>{p.rendimento_m}</td>
                  <td style={{ padding: '12px' }}>{p.rendimento_m2}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{p.composicao}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button onClick={() => openModal(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', marginRight: '8px' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
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
                <input type="text" value={formData.composicao} onChange={e => setFormData({...formData, composicao: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} placeholder="Ex: 100% Poliéster" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}