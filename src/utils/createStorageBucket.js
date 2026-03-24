import { supabase } from '../config/supabase';
export async function checkBucketExists() {
  try {
    const {
      data,
      error
    } = await supabase.storage.listBuckets();
    if (error) {
      return {
        exists: false,
        error
      };
    }
    const avatarsBucket = data?.find(bucket => bucket.name === 'avatars');
    return {
      exists: !!avatarsBucket,
      bucket: avatarsBucket || null,
      error: null
    };
  } catch (error) {
    return {
      exists: false,
      error
    };
  }
}
export async function createBucketIfNotExists() {
  try {
    const check = await checkBucketExists();
    if (check.exists) {
      return {
        success: true,
        created: false,
        message: 'Bucket já existe',
        bucket: check.bucket
      };
    }
    const {
      data,
      error
    } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      fileSizeLimit: 2097152
    });
    if (error) {
      return {
        success: false,
        created: false,
        message: `Erro ao criar bucket: ${error.message}`,
        error: error.message
      };
    }
    return {
      success: true,
      created: true,
      message: 'Bucket criado com sucesso',
      bucket: data
    };
  } catch (error) {
    return {
      success: false,
      created: false,
      message: `Erro: ${error.message}`,
      error: error.message
    };
  }
}
export async function ensureBucketExists() {
  const check = await checkBucketExists();
  if (check.exists) {
    return {
      success: true,
      exists: true,
      message: 'Bucket "avatars" existe e está pronto para uso'
    };
  }
  const createResult = await createBucketIfNotExists();
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
    };
  }
  return {
    success: createResult.success,
    exists: true,
    message: createResult.message
  };
}
export async function testBucketAccess() {
  try {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        message: 'Usuário não autenticado'
      };
    }
    const {
      data,
      error
    } = await supabase.storage.from('avatars').list('', {
      limit: 1
    });
    if (error) {
      return {
        success: false,
        message: `Erro ao acessar bucket: ${error.message}`,
        error: error.message
      };
    }
    return {
      success: true,
      message: 'Bucket acessível e funcionando',
      canRead: true
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro ao testar acesso: ${error.message}`,
      error: error.message
    };
  }
}
