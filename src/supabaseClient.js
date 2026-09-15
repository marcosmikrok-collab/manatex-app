import { createClient } from '@supabase/supabase-js'

// Substitua com os dados de "Project Settings > API" do seu Supabase
const supabaseUrl = 'https://oialjsopijblczkqbvgq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYWxqc29waWpibGN6a3FidmdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0OTcxODIsImV4cCI6MjEwNTA3MzE4Mn0.QQ9-XcO63XXKxgnSPzO0g3Rv7YcOwrW9CUFq2e2YM20'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)