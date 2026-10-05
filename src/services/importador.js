import { createClient } from '@supabase/supabase-js'

// Lê as variáveis diretamente do projeto Vite / Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function importarProdutoDoSite(urlProduto, produtoId) {
  try {
    // 1. Procura o HTML da página do produto (usando proxy para evitar CORS)
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlProduto)}`)
    const data = await response.json()
    const htmlText = data.contents

    if (!htmlText) throw new Error("Não foi possível carregar o conteúdo da página do site.")

    // 2. Envia o HTML para o Gemini extrair cores e imagens
    const prompt = `
      Analise o HTML abaixo de um produto de e-commerce e extraia as variações de cores e imagens.
      Retorne APENAS um JSON válido no seguinte formato sem formatação markdown:
      {
        "cores": [
          { "nome_cor": "Nome da Cor", "codigo_hex": "#HEX", "imagem_url": "URL_DA_IMAGEM" }
        ]
      }
      Se a imagem for relativa, converta para URL absoluta usando a base: ${new URL(urlProduto).origin}
      HTML:
      ${htmlText.substring(0, 80000)}
    `

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    )

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates[0].content.parts[0].text
    const parsedData = JSON.parse(rawText)

    // 3. Prepara e insere os registos diretamente na tabela do Supabase
    const registrosParaInserir = parsedData.cores.map(cor => ({
      produto_id: produtoId,
      nome_cor: cor.nome_cor,
      codigo_hex: cor.codigo_hex || '#000000',
      imagem_url: cor.imagem_url
    }))

    const { data: inseridos, error } = await supabase
      .from('produto_cores')
      .insert(registrosParaInserir)
      .select()

    if (error) throw error

    return { success: true, adicionados: inseridos }

  } catch (err) {
    console.error("Erro na importação:", err)
    throw err
  }
}
