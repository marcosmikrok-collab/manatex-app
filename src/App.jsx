import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Edit2, Trash2, Plus, Search, LogOut } from 'lucide-react';

// ==========================================
// Funções Utilitárias de Formatação (pt-BR)
// ==========================================

// Formata valores monetários para R$ 0,00
const formatMoeda = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor);
  if (isNaN(num)) return '-';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Formata números decimais/medidas para 0,00
const formatNumero = (valor, sufixo = '') => {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor);
  if (isNaN(num)) return '-';
  return `${num.toLocaleString('pt-BR')}${sufixo}`;
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('manatex'); // 'manatex' ou 'msports'
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Define as cores dinâmicas da marca selecionada
  const brandColor = selectedBrand === 'manatex' ? '#1e3a8a' : '#dc2626';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedBrand]);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) setProfile(data);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('marca', selectedBrand)
        .order('nome', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter((p) => p.id !== id));
    } catch (err) {
      alert('Erro ao excluir produto: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredProducts = products.filter((p) =>
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.composicao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Catálogo de Produtos</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>Gerenciamento Multi-marcas</p>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#374151' }}>{user.email} ({profile?.role || 'usuário'})</span>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        )}
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setSelectedBrand('manatex')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            backgroundColor: selectedBrand === 'manatex' ? '#1e3a8a' : '#e5e7eb',
            color: selectedBrand === 'manatex' ? '#ffffff' : '#374151',
            transition: 'all 0.2s'
          }}
        >
          MANATEX
        </button>
        <button
          onClick={() => setSelectedBrand('msports')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            backgroundColor: selectedBrand === 'msports' ? '#dc2626' : '#e5e7eb',
            color: selectedBrand === 'msports' ? '#ffffff' : '#374151',
            transition: 'all 0.2s'
          }}
        >
          MSPORTS
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Buscar por produto ou composição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb', color: '#374151' }}>
              <th style={{ padding: '12px' }}>PRODUTO</th>
              <th style={{ padding: '12px' }}>À VISTA</th>
              <th style={{ padding: '12px' }}>À PRAZO</th>
              <th style={{ padding: '12px' }}>VALOR M</th>
              <th style={{ padding: '12px' }}>VALOR M²</th>
              <th style={{ padding: '12px' }}>LARG.</th>
              <th style={{ padding: '12px' }}>GRAM.</th>
              <th style={{ padding: '12px' }}>REND. M</th>
              <th style={{ padding: '12px' }}>REND. M²</th>
              <th style={{ padding: '12px' }}>COMPOSIÇÃO</th>
              {profile?.role === 'admin' && <th style={{ padding: '12px', textAlign: 'center' }}>AÇÕES</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Carregando produtos...</td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Nenhum produto encontrado.</td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.nome}</td>
                  
                  <td style={{ padding: '12px', color: brandColor, fontWeight: 'bold' }}>
                    {formatMoeda(p.a_vista)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatMoeda(p.a_prazo)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatMoeda(p.valor_m)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatMoeda(p.valor_m2)}
                  </td>

                  <td style={{ padding: '12px' }}>
                    {formatNumero(p.largura, 'm')}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatNumero(p.gramatura, 'g')}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatNumero(p.rendimento_m)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {formatNumero(p.rendimento_m2)}
                  </td>

                  <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{p.composicao}</td>

                  {profile?.role === 'admin' && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
