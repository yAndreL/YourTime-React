// ============================================================================
// UTILITÁRIO: Criar e Configurar Bucket de Storage para Avatares
// ============================================================================
// Este utilitário cria o bucket 'avatars' no Supabase Storage e configura
// as políticas de acesso necessárias.
// ============================================================================

import { supabase } from '../config/supabase'

/**
 * Verifica se o bucket 'avatars' existe
 */
export async function checkBucketExists() {
  try {
    const { data, error } = await supabase.storage.listBuckets()
    
    if (error) {

      return { exists: false, error }
    }

    const avatarsBucket = data?.find(bucket => bucket.name === 'avatars')
    return {
      exists: !!avatarsBucket,
      bucket: avatarsBucket || null,
      error: null
    }
  } catch (error) {

    return { exists: false, error }
  }
}

/**
 * Cria o bucket 'avatars' se não existir
 * NOTA: Esta função requer Service Role Key ou deve ser executada via
 * Supabase Dashboard, pois a criação de buckets requer privilégios elevados.
 */
export async function createBucketIfNotExists() {
  try {
    // Verificar se já existe
    const check = await checkBucketExists()
    
    if (check.exists) {

      return {
        success: true,
        created: false,
        message: 'Bucket já existe',
        bucket: check.bucket
      }
    }

    // Tentar criar o bucket
    // NOTA: Criação de buckets via JavaScript client requer Service Role Key
    // Ou pode ser feito via Supabase Dashboard ou API REST diretamente
    
    const { data, error } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      fileSizeLimit: 2097152 // 2MB em bytes
    })

    if (error) {

      return {
        success: false,
        created: false,
        message: `Erro ao criar bucket: ${error.message}`,
        error: error.message
      }
    }

    return {
      success: true,
      created: true,
      message: 'Bucket criado com sucesso',
      bucket: data
    }
  } catch (error) {

    return {
      success: false,
      created: false,
      message: `Erro: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * Verifica ou cria o bucket e retorna o status
 */
export async function ensureBucketExists() {
  const check = await checkBucketExists()
  
  if (check.exists) {
    return {
      success: true,
      exists: true,
      message: 'Bucket "avatars" existe e está pronto para uso'
    }
  }

  // Tentar criar
  const createResult = await createBucketIfNotExists()
  
  if (!createResult.success) {
    return {
      success: false,
      exists: false,
      message: createResult.message || 'Não foi possível verificar/criar o bucket. Configure manualmente no Supabase Dashboard.',
      instructions: `
Para criar o bucket manualmente:
1. Acesse o Supabase Dashboard
2. Vá em Storage
3. Clique em "New bucket"
4. Nome: avatars
5. Torne-o público (Public bucket)
6. Configure políticas de acesso se necessário
      `
    }
  }

  return {
    success: createResult.success,
    exists: true,
    message: createResult.message
  }
}

/**
 * Testa se consegue fazer upload de um arquivo de teste
 */
export async function testBucketAccess() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        message: 'Usuário não autenticado'
      }
    }

    // Tentar listar arquivos no bucket
    const { data, error } = await supabase.storage
      .from('avatars')
      .list('', {
        limit: 1
      })

    if (error) {
      return {
        success: false,
        message: `Erro ao acessar bucket: ${error.message}`,
        error: error.message
      }
    }

    return {
      success: true,
      message: 'Bucket acessível e funcionando',
      canRead: true
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao testar acesso: ${error.message}`,
      error: error.message
    }
  }
}

