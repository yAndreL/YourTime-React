import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import MainLayout from '../components/layout/MainLayout';
import PerfilSkeleton from '../components/ui/PerfilSkeleton';
import CacheService from '../services/CacheService';
import { obterTextoDataLocal } from '../utils/dateUtils';
import { FiEdit2, FiSave, FiX, FiUser, FiBriefcase, FiCalendar, FiClock, FiCamera, FiUpload } from 'react-icons/fi';
function Perfil() {
  const {
    t,
    currentLanguage
  } = useLanguage();
  const navigate = useNavigate();
  const {
    userId
  } = useParams();
  const {
    showSuccess,
    showError
  } = useToast();
  const obterPerfilEmCache = idUsuarioAlvo => {
    const emCache = CacheService.get('profile', idUsuarioAlvo);
    return emCache || null;
  };
  const obterEstatisticasEmCache = idUsuarioAlvo => {
    const emCache = CacheService.get('profile_stats', idUsuarioAlvo);
    return emCache || null;
  };
  const inicializarDoCache = () => {
    try {
      const idUsuarioUrl = userId;
      const idUsuarioEmCache = idUsuarioUrl || sessionStorage.getItem('currentUserId');
      if (idUsuarioEmCache) {
        const perfilEmCacheInicial = obterPerfilEmCache(idUsuarioEmCache);
        if (perfilEmCacheInicial) {
          return perfilEmCacheInicial;
        }
      }
    } catch (e) {}
    return null;
  };
  const [dadosUsuario, setDadosUsuario] = useState(inicializarDoCache());
  const [editando, setEditando] = useState(false);
  const [carregandoDadosPerfil, setCarregandoDadosPerfil] = useState(false);
  const [exibirSkeleton, setExibirSkeleton] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ehAdministrador, setEhAdministrador] = useState(false);
  const [visualizandoOutroUsuario, setVisualizandoOutroUsuario] = useState(false);
  const [enviandoFotoPerfil, setEnviandoFotoPerfil] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const initializeAvatarUrl = () => {
    const initialUserData = inicializarDoCache();
    return initialUserData?.avatar_url || null;
  };
  const [urlAvatar, setUrlAvatar] = useState(initializeAvatarUrl());
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null);
  const initializeStatsFromCache = () => {
    try {
      const cachedUserId = userId || sessionStorage.getItem('currentUserId');
      if (cachedUserId) {
        const cached = obterEstatisticasEmCache(cachedUserId);
        if (cached) {
          return cached;
        }
      }
    } catch (e) {}
    return {
      horasTrabalhadas: '0h 0m',
      saldoHoras: '+0h 0m',
      horasExtras: '0h 0m',
      projetosAtivos: 0
    };
  };
  const [estatisticas, setEstatisticas] = useState(initializeStatsFromCache());
  const inicializarDadosFormulario = () => {
    const initialUserData = inicializarDoCache();
    if (initialUserData) {
      return {
        nome: initialUserData.nome || '',
        cargo: initialUserData.cargo || '',
        departamento: initialUserData.departamento || '',
        data_admissao: initialUserData.data_admissao || '',
        carga_horaria: initialUserData.carga_horaria || 40,
        hora_entrada: (initialUserData.hora_entrada || '09:00:00').substring(0, 5),
        hora_saida: (initialUserData.hora_saida || '18:00:00').substring(0, 5)
      };
    }
    return {
      nome: '',
      cargo: '',
      departamento: '',
      data_admissao: '',
      carga_horaria: 40,
      hora_entrada: '09:00',
      hora_saida: '18:00'
    };
  };
  const [dadosFormulario, setDadosFormulario] = useState(inicializarDadosFormulario());
  const buildMonthBounds = () => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const formatarData = d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return {
      startOfMonth: formatarData(primeiroDia),
      endOfMonth: formatarData(ultimoDia)
    };
  };
  const computeStatsFromHours = hoursData => {
    let totalMinutes = 0;
    let overtimeMinutes = 0;
    if (hoursData && hoursData.length > 0) {
      hoursData.forEach(record => {
        const calculateHours = (entrada, saida) => {
          if (!entrada || !saida) return 0;
          const [h1, m1] = entrada.split(':').map(Number);
          const [h2, m2] = saida.split(':').map(Number);
          return h2 * 60 + m2 - (h1 * 60 + m1);
        };
        const dailyMinutes = calculateHours(record.entrada1, record.saida1) + calculateHours(record.entrada2, record.saida2);
        totalMinutes += dailyMinutes;
        const normalWorkDay = 8 * 60;
        if (dailyMinutes > normalWorkDay) {
          overtimeMinutes += dailyMinutes - normalWorkDay;
        }
      });
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const horasTrabalhadas = `${hours}h ${minutes}m`;
    const overtimeHours = Math.floor(overtimeMinutes / 60);
    const overtimeMins = overtimeMinutes % 60;
    const horasExtras = `${overtimeHours}h ${overtimeMins}m`;
    const diasUteis = 22;
    const horasEsperadas = diasUteis * 8 * 60;
    const saldoMinutes = totalMinutes - horasEsperadas;
    const saldoHours = Math.floor(Math.abs(saldoMinutes) / 60);
    const saldoMins = Math.abs(saldoMinutes) % 60;
    const saldoHoras = `${saldoMinutes >= 0 ? '+' : '-'}${saldoHours}h ${saldoMins}m`;
    return {
      horasTrabalhadas,
      saldoHoras,
      horasExtras
    };
  };
  const buscarEstatisticasPerfilEmParalelo = async (idUsuarioAlvo, tenantId) => {
    const {
      startOfMonth,
      endOfMonth
    } = buildMonthBounds();
    let projetosQuery = supabase.from('projetos').select('id', {
      count: 'exact',
      head: true
    }).eq('status', 'ativo');
    if (tenantId) {
      projetosQuery = projetosQuery.or(`superior_empresa_id.eq.${tenantId},superior_empresa_id.is.null`);
    }
    const [{
      data: hoursData
    }, {
      count: projetosCount,
      error: projetosError
    }] = await Promise.all([supabase.from('agendamento').select('entrada1, saida1, entrada2, saida2').eq('user_id', idUsuarioAlvo).gte('data', startOfMonth).lte('data', endOfMonth), projetosQuery]);
    if (projetosError) {}
    const base = computeStatsFromHours(hoursData || []);
    return {
      ...base,
      projetosAtivos: projetosCount ?? 0
    };
  };
  useEffect(() => {
    carregarPaginaPerfil();
  }, [userId]);
  const aplicarLinhaPerfil = (perfil, idUsuarioAlvo, superiorEmpresaResolvido) => {
    const dadosUsuarioConstruidos = {
      email: perfil?.email || '',
      nome: perfil?.nome || '',
      cargo: perfil?.cargo || '',
      departamento: perfil?.departamento || '',
      data_admissao: perfil?.data_admissao || obterTextoDataLocal(),
      carga_horaria: perfil?.carga_horaria || 40,
      hora_entrada: perfil?.hora_entrada || '09:00:00',
      hora_saida: perfil?.hora_saida || '18:00:00',
      user_id: idUsuarioAlvo,
      role: perfil?.role || 'user',
      superior_empresa_id: superiorEmpresaResolvido,
      avatar_url: perfil?.avatar_url || null
    };
    setDadosUsuario(dadosUsuarioConstruidos);
    CacheService.set('profile', dadosUsuarioConstruidos, idUsuarioAlvo, 10 * 60 * 1000);
    if (perfil?.avatar_url) {
      const urlAvatarDefinir = perfil.avatar_url.trim();
      if (urlAvatarDefinir) {
        setUrlAvatar(urlAvatarDefinir);
      }
    } else {
      setUrlAvatar(null);
    }
    setDadosFormulario({
      nome: dadosUsuarioConstruidos.nome,
      cargo: dadosUsuarioConstruidos.cargo,
      departamento: dadosUsuarioConstruidos.departamento,
      data_admissao: dadosUsuarioConstruidos.data_admissao,
      carga_horaria: dadosUsuarioConstruidos.carga_horaria,
      hora_entrada: (dadosUsuarioConstruidos.hora_entrada || '09:00:00').substring(0, 5),
      hora_saida: (dadosUsuarioConstruidos.hora_saida || '18:00:00').substring(0, 5)
    });
  };
  const resolverIdSuperiorEmpresa = async (perfil, idUsuarioAlvo) => {
    if (perfil?.superior_empresa_id) {
      return perfil.superior_empresa_id;
    }
    const {
      data: dadosUsuarioEmpresas
    } = await supabase.from('user_empresas').select('empresa_id, empresas!empresa_id ( superior_empresa_id )').eq('user_id', idUsuarioAlvo).limit(1).maybeSingle();
    return dadosUsuarioEmpresas?.empresas?.superior_empresa_id || null;
  };
  const carregarPaginaPerfil = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const idUsuarioAlvo = userId || user.id;
      const visualizandoOutro = !!(userId && userId !== user.id);
      setVisualizandoOutroUsuario(visualizandoOutro);
      sessionStorage.setItem('currentUserId', idUsuarioAlvo);
      const perfilEmCache = obterPerfilEmCache(idUsuarioAlvo);
      const estatisticasEmCache = obterEstatisticasEmCache(idUsuarioAlvo);
      if (perfilEmCache) {
        setDadosUsuario(perfilEmCache);
        setUrlAvatar(perfilEmCache.avatar_url || null);
        setSuperiorEmpresaId(perfilEmCache.superior_empresa_id || 'default');
        setDadosFormulario({
          nome: perfilEmCache.nome,
          cargo: perfilEmCache.cargo,
          departamento: perfilEmCache.departamento,
          data_admissao: perfilEmCache.data_admissao,
          carga_horaria: perfilEmCache.carga_horaria,
          hora_entrada: (perfilEmCache.hora_entrada || '09:00:00').substring(0, 5),
          hora_saida: (perfilEmCache.hora_saida || '18:00:00').substring(0, 5)
        });
        if (estatisticasEmCache) {
          setEstatisticas(estatisticasEmCache);
        }
        setCarregandoDadosPerfil(false);
        setExibirSkeleton(false);
      } else {
        setCarregandoDadosPerfil(true);
        setExibirSkeleton(true);
      }
      const [{
        data: perfilUsuarioLogado
      }, {
        data: perfilAlvo,
        error: erroPerfil
      }] = await Promise.all([supabase.from('profiles').select('role').eq('id', user.id).single(), supabase.from('profiles').select('*').eq('id', idUsuarioAlvo).single()]);
      const usuarioAtualEhAdmin = perfilUsuarioLogado?.role === 'admin';
      setEhAdministrador(usuarioAtualEhAdmin);
      if (visualizandoOutro && !usuarioAtualEhAdmin) {
        navigate('/perfil');
        return;
      }
      if (erroPerfil && erroPerfil.code !== 'PGRST116') {}
      if (!perfilAlvo && !perfilEmCache) {
        setCarregandoDadosPerfil(false);
        setExibirSkeleton(false);
        return;
      }
      let inquilinoParaEstatisticas = perfilAlvo?.superior_empresa_id || null;
      let idSuperior = inquilinoParaEstatisticas;
      if (perfilAlvo && !idSuperior) {
        idSuperior = await resolverIdSuperiorEmpresa(perfilAlvo, idUsuarioAlvo);
      }
      const superiorParaExibicao = idSuperior || 'default';
      setSuperiorEmpresaId(superiorParaExibicao);
      if (perfilAlvo) {
        aplicarLinhaPerfil(perfilAlvo, idUsuarioAlvo, superiorParaExibicao);
      }
      inquilinoParaEstatisticas = perfilAlvo?.superior_empresa_id || (idSuperior && idSuperior !== 'default' ? idSuperior : null);
      const estatisticasCalculadas = await buscarEstatisticasPerfilEmParalelo(idUsuarioAlvo, inquilinoParaEstatisticas);
      setEstatisticas(estatisticasCalculadas);
      CacheService.set('profile_stats', estatisticasCalculadas, idUsuarioAlvo, 10 * 60 * 1000);
    } catch (error) {} finally {
      setCarregandoDadosPerfil(false);
      setExibirSkeleton(false);
    }
  };
  const iniciarEdicaoPerfil = () => {
    setEditando(true);
  };
  const cancelarEdicaoPerfil = () => {
    setEditando(false);
    setDadosFormulario({
      nome: dadosUsuario.nome,
      cargo: dadosUsuario.cargo,
      departamento: dadosUsuario.departamento,
      data_admissao: dadosUsuario.data_admissao,
      carga_horaria: dadosUsuario.carga_horaria,
      hora_entrada: (dadosUsuario.hora_entrada || '09:00:00').substring(0, 5),
      hora_saida: (dadosUsuario.hora_saida || '18:00:00').substring(0, 5)
    });
    setNovaSenha('');
    setConfirmarSenha('');
  };
  const salvarAlteracoesPerfil = async () => {
    try {
      setSalvando(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (novaSenha || confirmarSenha) {
        if (novaSenha !== confirmarSenha) {
          showError('As senhas não coincidem.');
          setSalvando(false);
          return;
        }
        if (novaSenha.length < 6) {
          showError('A senha deve ter no mínimo 6 caracteres.');
          setSalvando(false);
          return;
        }
      }
      if (novaSenha && novaSenha === confirmarSenha) {
        const {
          error: passwordError
        } = await supabase.auth.updateUser({
          password: novaSenha
        });
        if (passwordError) {
          showError('Erro ao atualizar senha: ' + passwordError.message);
          setSalvando(false);
          return;
        }
      }
      const {
        data: existingProfile
      } = await supabase.from('profiles').select('id').eq('id', user.id).single();
      let result;
      const dadosPerfil = {
        nome: dadosFormulario.nome,
        cargo: dadosFormulario.cargo,
        departamento: dadosFormulario.departamento,
        data_admissao: dadosFormulario.data_admissao,
        carga_horaria: dadosFormulario.carga_horaria,
        hora_entrada: `${dadosFormulario.hora_entrada}:00`,
        hora_saida: `${dadosFormulario.hora_saida}:00`
      };
      if (existingProfile) {
        result = await supabase.from('profiles').update(dadosPerfil).eq('id', user.id);
      } else {
        result = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          ...dadosPerfil
        });
      }
      if (result.error) {
        showError('Erro ao salvar perfil. Tente novamente.');
        return;
      }
      const dadosUsuarioAtualizados = {
        ...dadosUsuario,
        ...dadosFormulario
      };
      setDadosUsuario(dadosUsuarioAtualizados);
      const idUsuarioAlvo = userId || user.id;
      CacheService.remove('profile', idUsuarioAlvo);
      setNovaSenha('');
      setConfirmarSenha('');
      setEditando(false);
      showSuccess(novaSenha ? 'Perfil e senha atualizados com sucesso!' : 'Perfil atualizado com sucesso!');
    } catch (error) {
      showError('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };
  const aoAlterarCampoFormularioPerfil = e => {
    const {
      name,
      value
    } = e.target;
    setDadosFormulario(prev => ({
      ...prev,
      [name]: name === 'carga_horaria' ? parseInt(value) || 0 : value
    }));
  };
  const processarUploadFotoPerfil = async event => {
    try {
      setEnviandoFotoPerfil(true);
      const file = event.target.files[0];
      if (!file) {
        setEnviandoFotoPerfil(false);
        return;
      }
      if (!file.type || !file.type.startsWith('image/')) {
        showError('Por favor, selecione uma imagem válida.');
        setEnviandoFotoPerfil(false);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showError('A imagem deve ter no máximo 2MB.');
        setEnviandoFotoPerfil(false);
        return;
      }
      const {
        data: {
          user
        },
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !user) {
        showError('Erro de autenticação. Faça login novamente.');
        setEnviandoFotoPerfil(false);
        return;
      }
      const empresaFolder = superiorEmpresaId || 'default';
      if (!superiorEmpresaId) {}
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${empresaFolder}/${fileName}`;
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
      };
      const contentType = mimeTypes[fileExt] || file.type || 'image/jpeg';
      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType
      });
      if (uploadError) {
        let errorMessage = 'Erro ao enviar foto.';
        if (uploadError.message) {
          const errorMsg = uploadError.message.toLowerCase();
          if (errorMsg.includes('bucket not found') || errorMsg.includes('does not exist') || errorMsg.includes('the resource was not found') || uploadError.statusCode === '404') {
            errorMessage = '❌ Bucket "avatars" não encontrado!\n\n📋 Solução: Acesse o Supabase Dashboard → Storage → New Bucket\nCrie um bucket chamado "avatars" e marque como público.\n\nOu execute o arquivo CREATE_STORAGE_BUCKET.sql no SQL Editor.';
          } else if (errorMsg.includes('mime type') || errorMsg.includes('application/json') || errorMsg.includes('not supported')) {
            errorMessage = '❌ O bucket "avatars" não está configurado corretamente!\n\n📋 Solução: Vá no Supabase Dashboard → Storage → avatars → Settings\nConfigure "Allowed MIME types" para aceitar:\n• image/png\n• image/jpeg\n• image/jpg\n• image/gif\n• image/webp\n\nOu recrie o bucket usando CREATE_STORAGE_BUCKET.sql';
          } else {
            errorMessage = `Erro: ${uploadError.message}`;
          }
        }
        showError(errorMessage);
        setEnviandoFotoPerfil(false);
        return;
      }
      if (!uploadData || !uploadData.path) {
        showError('Upload concluído, mas não foi possível obter a URL da imagem.');
        setEnviandoFotoPerfil(false);
        return;
      }
      const {
        data: publicUrlData
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!publicUrlData || !publicUrlData.publicUrl) {
        showError('Erro ao obter URL pública da imagem.');
        setEnviandoFotoPerfil(false);
        return;
      }
      const timestamp = new Date().getTime();
      const baseUrl = publicUrlData.publicUrl;
      const separator = baseUrl.includes('?') ? '&' : '?';
      const newAvatarUrl = `${baseUrl}${separator}t=${timestamp}`;
      try {
        const testResponse = await fetch(newAvatarUrl, {
          method: 'HEAD'
        });
      } catch (testError) {}
      const {
        error: updateError
      } = await supabase.from('profiles').update({
        avatar_url: newAvatarUrl
      }).eq('id', user.id);
      if (updateError) {
        showError('Erro ao salvar foto no perfil. A imagem foi enviada, mas não foi vinculada ao perfil.');
        setEnviandoFotoPerfil(false);
        return;
      }
      setUrlAvatar(newAvatarUrl);
      showSuccess('Foto atualizada com sucesso!');
    } catch (error) {
      showError('Ocorreu um erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setEnviandoFotoPerfil(false);
      if (event && event.target) {
        event.target.value = '';
      }
    }
  };
  const obterIniciais = name => {
    if (!name) return 'YT';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const formatarDataAdmissaoPorIdioma = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const locale = currentLanguage === 'en-US' ? 'en-US' : 'pt-BR';
    const options = currentLanguage === 'en-US' ? {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    } : {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString(locale, options);
  };
  if (exibirSkeleton && !dadosUsuario) {
    return <MainLayout title="Perfil">
        <PerfilSkeleton />
      </MainLayout>;
  }
  if (!dadosUsuario) {
    return <MainLayout title="Perfil">
        <PerfilSkeleton />
      </MainLayout>;
  }
  return <MainLayout title={visualizandoOutroUsuario ? t('perfil.title') : t('perfil.title')} subtitle={visualizandoOutroUsuario ? dadosUsuario?.nome : t('perfil.subtitle')}>
      <div className="max-w-4xl mx-auto">
        <div className="yt-card shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="relative inline-block">
                  {urlAvatar ? <img src={urlAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-md" onLoad={() => {}} onError={e => {}} /> : <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                      {obterIniciais(dadosUsuario?.nome)}
                    </div>}
                  {!visualizandoOutroUsuario && <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-2 border-blue-600 dark:border-blue-500">
                      {enviandoFotoPerfil ? <FiUpload className="w-4 h-4 text-blue-600 animate-pulse" /> : <FiCamera className="w-4 h-4 text-blue-600" />}
                      <input id="photo-upload" type="file" accept="image/*" onChange={processarUploadFotoPerfil} disabled={enviandoFotoPerfil} className="hidden" />
                    </label>}
                </div>
                {!visualizandoOutroUsuario && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Clique no ícone para alterar a foto
                  </p>}
                {enviandoFotoPerfil && <p className="mt-1 text-xs text-blue-600">Enviando foto...</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="flex flex-col">
                <div className="mb-4">
                  <div>
                    {editando ? <input type="text" name="nome" value={dadosFormulario.nome} onChange={aoAlterarCampoFormularioPerfil} placeholder="Nome completo" className="text-xl font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-blue-500 focus:outline-none w-full mb-1" /> : <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {dadosUsuario?.nome || 'Nome não definido'}
                      </h2>}
                    {editando && ehAdministrador ? <input type="text" name="cargo" value={dadosFormulario.cargo} onChange={aoAlterarCampoFormularioPerfil} placeholder="Cargo" className="text-sm text-gray-600 border-b border-gray-300 focus:outline-none w-full mt-1" /> : <p className="text-sm text-gray-600 mt-1">{dadosUsuario?.cargo || 'Cargo não definido'}</p>}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <FiUser className="w-3.5 h-3.5" /> Email
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 yt-inset px-3 py-2 rounded-md border border-gray-200/80 dark:border-gray-700/80">{dadosUsuario?.email}</p>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <FiBriefcase className="w-3.5 h-3.5" /> {t('perfil.position')}
                    </label>
                    {editando && ehAdministrador ? <input type="text" name="cargo" value={dadosFormulario.cargo} onChange={aoAlterarCampoFormularioPerfil} placeholder={t('perfil.positionPlaceholder')} className="w-full px-3 py-2 text-sm border rounded-md yt-field focus:ring-2 focus:ring-blue-500 focus:border-transparent" /> : <p className="text-sm text-gray-900 dark:text-gray-100 yt-inset px-3 py-2 rounded-md border border-gray-200/80 dark:border-gray-700/80">
                        {dadosUsuario?.cargo || t('perfil.positionNotDefined')}
                      </p>}
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <FiBriefcase className="w-3.5 h-3.5" /> {t('perfil.department')}
                    </label>
                    {editando ? <input type="text" name="departamento" value={dadosFormulario.departamento} onChange={aoAlterarCampoFormularioPerfil} placeholder={t('perfil.departmentPlaceholder')} className="w-full px-3 py-2 text-sm border rounded-md yt-field focus:ring-2 focus:ring-blue-500 focus:border-transparent" /> : <p className="text-sm text-gray-900 dark:text-gray-100 yt-inset px-3 py-2 rounded-md border border-gray-200/80 dark:border-gray-700/80">
                        {dadosUsuario?.departamento || t('perfil.departmentNotDefined')}
                      </p>}
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <FiCalendar className="w-3.5 h-3.5" /> {t('perfil.admissionDate')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 yt-inset px-3 py-2 rounded-md border border-gray-200/80 dark:border-gray-700/80">
                      {formatarDataAdmissaoPorIdioma(dadosUsuario?.data_admissao)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <FiUser className="w-3.5 h-3.5" /> {t('perfil.newPassword')}
                    </label>
                    <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} disabled={!editando} placeholder={editando ? t('perfil.newPasswordPlaceholder') : t('perfil.passwordMask')} className="w-full px-3 py-2 text-sm border rounded-md yt-field focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800" />
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <FiUser className="w-3.5 h-3.5" /> {t('perfil.confirmPassword')}
                    </label>
                    <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} disabled={!editando} placeholder={editando ? t('perfil.confirmPasswordPlaceholder') : t('perfil.passwordMask')} className="w-full px-3 py-2 text-sm border rounded-md yt-field focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800" />
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <FiClock className="w-3.5 h-3.5" /> {t('perfil.workSchedule')}
                    </label>
                    {editando && ehAdministrador ? <input type="number" name="carga_horaria" value={dadosFormulario.carga_horaria} onChange={aoAlterarCampoFormularioPerfil} min="1" max="60" className="w-full px-3 py-2 text-sm border rounded-md yt-field focus:ring-2 focus:ring-blue-500 focus:border-transparent" /> : <p className="text-sm text-gray-900 dark:text-gray-100 yt-inset px-3 py-2 rounded-md border border-gray-200/80 dark:border-gray-700/80">
                        {dadosUsuario?.carga_horaria || 40}{t('perfil.perWeek')}
                      </p>}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <FiClock className="w-3.5 h-3.5" /> {t('perfil.workShift')}
                    </label>
                    {editando && ehAdministrador ? (
                      <div className="flex items-center gap-2">
                        <input type="time" name="hora_entrada" value={dadosFormulario.hora_entrada} onChange={aoAlterarCampoFormularioPerfil} className="flex-1 px-3 py-2 text-sm border rounded-md yt-field focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('perfil.shiftSeparator')}</span>
                        <input type="time" name="hora_saida" value={dadosFormulario.hora_saida} onChange={aoAlterarCampoFormularioPerfil} className="flex-1 px-3 py-2 text-sm border rounded-md yt-field focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100 yt-inset px-3 py-2 rounded-md border border-gray-200/80 dark:border-gray-700/80">
                        {(dadosUsuario?.hora_entrada || '09:00:00').substring(0, 5)} - {(dadosUsuario?.hora_saida || '18:00:00').substring(0, 5)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('perfil.monthStats')}</h3>
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">{t('perfil.hoursWorked')}</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estatisticas.horasTrabalhadas}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">{t('perfil.overtimeHours')}</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{estatisticas.horasExtras || '0h 0m'}</p>
                  </div>
                  
                  <div className={`bg-gradient-to-r ${estatisticas.saldoHoras.startsWith('+') ? 'from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-950/20 border-green-200 dark:border-green-800' : 'from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-950/20 border-red-200 dark:border-red-800'} p-4 rounded-lg border`}>
                    <p className={`text-xs font-medium ${estatisticas.saldoHoras.startsWith('+') ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'} mb-1`}>
                      {t('perfil.hoursBalance')}
                    </p>
                    <p className={`text-2xl font-bold ${estatisticas.saldoHoras.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {estatisticas.saldoHoras}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">{t('perfil.activeProjects')}</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{estatisticas.projetosAtivos}</p>
                  </div>
                </div>

                <div className="mt-4 p-3 yt-inset rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                    {t('perfil.statsNote')}
                  </p>
                </div>
              </div>
            </div>

            {!visualizandoOutroUsuario && <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                {editando ? <>
                    <button onClick={salvarAlteracoesPerfil} disabled={salvando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                      {salvando ? t('perfil.savingButton') : t('perfil.saveButton')}
                    </button>
                    <button type="button" onClick={cancelarEdicaoPerfil} disabled={salvando} className="flex items-center gap-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      <FiX className="w-4 h-4" />
                      {t('perfil.cancelButton')}
                    </button>
                  </> : <button onClick={iniciarEdicaoPerfil} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg">
                    <FiEdit2 className="w-4 h-4" />
                    {t('perfil.editProfileButton')}
                  </button>}
              </div>}
          </div>
        </div>
      </div>
    </MainLayout>;
}
export default Perfil;
