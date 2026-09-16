import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, Plus, Edit2, Trash2, LogOut, Package, X } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '',
    largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else setUserRole('user');
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data) setUserRole(data.role);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('produtos').select('*').order('id', { ascending: true });
    if (!error) setProducts(data || []);
  };

  useEffect(() => {
    if (session) fetchProducts();
  }, [session]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    let result;
    if (isRegistering) {
      result = await supabase.auth.signUp({ email, password });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    if (result.error) setError(result.error.message);
  };

  const handleLogout = () => supabase.auth.signOut();

  const handleSaveProduct = async (e) => {
    e.preventDefault();
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
    };

    if (editingId) {
      await supabase.from('produtos').update(payload).eq('id', editingId);
    } else {
      await supabase.from('produtos').insert([payload]);
    }
    closeModal();
    fetchProducts();
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
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
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '', a_vista: '', a_prazo: '', valor_m: '', valor_m2: '',
        largura: '', gramatura: '', rendimento_m: '', rendimento_m2: '', composicao: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      await supabase.from('produtos').delete().eq('id', id);
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(p => 
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.composicao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-emerald-600 p-6 text-white text-center">
            <h1 className="text-3xl font-extrabold tracking-wide">Manatex</h1>
            <p className="text-emerald-100 text-sm mt-1">Tabela de Preços & Produtos</p>
          </div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              {isRegistering ? 'Criar Nova Conta' : 'Acessar Sistema'}
            </h2>
            {error && <p className="text-red-500 text-xs mb-3 text-center">{error}</p>}
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition">
                {isRegistering ? 'Cadastrar' : 'Entrar'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-emerald-600 hover:underline font-semibold">
                {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-200" />
            <div>
              <h1 className="text-2xl font-black tracking-wider leading-none">Manatex</h1>
              <span className="text-xs text-emerald-200 uppercase font-semibold">Têxtil • Tabela de Preços</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${userRole === 'admin' ? 'bg-amber-400 text-slate-900' : 'bg-emerald-600 text-white'}`}>
              {userRole === 'admin' ? 'Painel Admin' : 'Visualização'}
            </span>
            <button onClick={handleLogout} className="p-2 hover:bg-emerald-800 rounded-lg text-emerald-100 hover:text-white transition" title="Sair">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="text" placeholder="Buscar produto ou composição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          {userRole === 'admin' && (
            <button onClick={() => openModal()} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition">
              <Plus size={18} /> Novo Produto
            </button>
          )}
        </div>

        {/* Tabela Desktop */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                <th className="p-3">Produto</th>
                <th className="p-3">À Vista</th>
                <th className="p-3">À Prazo</th>
                <th className="p-3">Valor M</th>
                <th className="p-3">Valor M²</th>
                <th className="p-3">Largura</th>
                <th className="p-3">Gram.</th>
                <th className="p-3">Rend. M</th>
                <th className="p-3">Rend. M²</th>
                <th className="p-3">Composição</th>
                {userRole === 'admin' && <th className="p-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-emerald-50/50 transition">
                  <td className="p-3 font-bold text-gray-900">{p.nome}</td>
                  <td className="p-3 font-semibold text-emerald-700">R$ {Number(p.a_vista || 0).toFixed(2)}</td>
                  <td className="p-3 font-semibold text-gray-700">R$ {Number(p.a_prazo || 0).toFixed(2)}</td>
                  <td className="p-3">R$ {Number(p.valor_m || 0).toFixed(2)}</td>
                  <td className="p-3">R$ {Number(p.valor_m2 || 0).toFixed(2)}</td>
                  <td className="p-3">{p.largura}m</td>
                  <td className="p-3">{p.gramatura}g</td>
                  <td className="p-3">{p.rendimento_m}</td>
                  <td className="p-3">{p.rendimento_m2}</td>
                  <td className="p-3 text-xs bg-gray-50 rounded font-medium">{p.composicao}</td>
                  {userRole === 'admin' && (
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openModal(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards Mobile */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-extrabold text-gray-900 text-lg">{p.nome}</h3>
                {userRole === 'admin' && (
                  <div className="flex gap-1">
                    <button onClick={() => openModal(p)} className="p-1 text-blue-600"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-red-600"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg text-sm mb-3">
                <div>
                  <span className="text-xs text-gray-500 block">À VISTA</span>
                  <span className="font-bold text-emerald-600 text-base">R$ {Number(p.a_vista || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">À PRAZO</span>
                  <span className="font-bold text-gray-800 text-base">R$ {Number(p.a_prazo || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">VALOR M / M²</span>
                  <span className="font-medium text-gray-700">R$ {p.valor_m} / R$ {p.valor_m2}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">LARG. / GRAM.</span>
                  <span className="font-medium text-gray-700">{p.largura}m / {p.gramatura}g</span>
                </div>
              </div>
              <div className="text-xs text-gray-600 flex justify-between items-center border-t pt-2">
                <span>Rendimento: <strong>{p.rendimento_m}m</strong> ({p.rendimento_m2} m²)</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">{p.composicao}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600">Nome do Produto</label>
                <input type="text" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">À Vista (R$)</label>
                  <input type="number" step="0.01" value={formData.a_vista} onChange={e => setFormData({...formData, a_vista: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">À Prazo (R$)</label>
                  <input type="number" step="0.01" value={formData.a_prazo} onChange={e => setFormData({...formData, a_prazo: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">Valor M (R$)</label>
                  <input type="number" step="0.01" value={formData.valor_m} onChange={e => setFormData({...formData, valor_m: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Valor M² (R$)</label>
                  <input type="number" step="0.01" value={formData.valor_m2} onChange={e => setFormData({...formData, valor_m2: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">Largura (m)</label>
                  <input type="number" step="0.01" value={formData.largura} onChange={e => setFormData({...formData, largura: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Gramatura (g)</label>
                  <input type="number" value={formData.gramatura} onChange={e => setFormData({...formData, gramatura: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">Rendimento M</label>
                  <input type="number" step="0.01" value={formData.rendimento_m} onChange={e => setFormData({...formData, rendimento_m: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Rendimento M²</label>
                  <input type="number" step="0.01" value={formData.rendimento_m2} onChange={e => setFormData({...formData, rendimento_m2: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600">Composição</label>
                <input type="text" value={formData.composicao} onChange={e => setFormData({...formData, composicao: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="ex: 92% PA 8% PUE" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg text-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
