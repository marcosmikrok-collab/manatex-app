import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function AlterarSenhaModal({ isOpen, onClose }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  if (!isOpen) return null;

  async function handleAlterarSenha(e) {
    e.preventDefault();
    setErro('');
    setSucesso(false);

    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      setErro(error.message);
    } else {
      setSucesso(true);
      setNovaSenha('');
      setConfirmarSenha('');
      setTimeout(() => {
        onClose();
        setSucesso(false);
      }, 2000);
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#0A8754]/10 flex items-center justify-center text-[#0A8754]">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900">Alterar Senha</h2>
            <p className="text-xs text-slate-500">Digite sua nova senha de acesso</p>
          </div>
        </div>

        {erro && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-600 text-xs font-medium">
            <AlertCircle size={15} className="shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 text-xs font-medium">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>Senha alterada com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleAlterarSenha} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-[#0A8754] focus:ring-2 focus:ring-[#0A8754]/15 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-[#0A8754] focus:ring-2 focus:ring-[#0A8754]/15 transition"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#0A8754] hover:bg-[#086E44] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
