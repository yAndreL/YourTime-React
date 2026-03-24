import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useModal } from '../hooks/useModal';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import Modal from '../components/ui/Modal';
import MainLayout from '../components/layout/MainLayout';
import PerfilSkeleton from '../components/ui/PerfilSkeleton';
import CacheService from '../services/CacheService';
import { getLocalDateString } from '../utils/dateUtils';
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
    modalState,
    showError: showModalError,
    closeModal
  } = useModal();
  const {
    showSuccess,
    showError
  } = useToast();
  const getCachedProfile = targetUserId => {
    const cached = CacheService.get('profile', targetUserId);
    return cached || null;
  };
  const getCachedStatistics = targetUserId => {
    const cached = CacheService.get('profile_stats', targetUserId);
    return cached || null;
  };
  const initializeFromCache = () => {
    try {
      const urlUserId = userId;
      const cachedUserId = urlUserId || sessionStorage.getItem('currentUserId');
      if (cachedUserId) {
        const cached = getCachedProfile(cachedUserId);
        if (cached) {
          return cached;
        }
      }
    } catch (e) {}
    return null;
  };
  const [userData, setUserData] = useState(initializeFromCache());
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewingOtherUser, setIsViewingOtherUser] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const initializeAvatarUrl = () => {
    const initialUserData = initializeFromCache();
    return initialUserData?.avatar_url || null;
  };
  const [avatarUrl, setAvatarUrl] = useState(initializeAvatarUrl());
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null);
  const initializeStatsFromCache = () => {
    try {
      const cachedUserId = userId || sessionStorage.getItem('currentUserId');
      if (cachedUserId) {
        const cached = getCachedStatistics(cachedUserId);
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
  const [statistics, setStatistics] = useState(initializeStatsFromCache());
  const initializeFormData = () => {
    const initialUserData = initializeFromCache();
    if (initialUserData) {
      return {
        nome: initialUserData.nome || '',
        cargo: initialUserData.cargo || '',
        departamento: initialUserData.departamento || '',
        data_admissao: initialUserData.data_admissao || '',
        carga_horaria: initialUserData.carga_horaria || 40
      };
    }
    return {
      nome: '',
      cargo: '',
      departamento: '',
      data_admissao: '',
      carga_horaria: 40
    };
  };
  const [formData, setFormData] = useState(initializeFormData());
  useEffect(() => {
    loadUserProfile();
    loadStatistics();
  }, [userId]);
  const loadUserProfile = async () => {
    let skeletonTimeout = null;
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
      const {
        data: currentUserProfile
      } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const isCurrentUserAdmin = currentUserProfile?.role === 'admin';
      setIsAdmin(isCurrentUserAdmin);
      const targetUserId = userId || user.id;
      const viewingOtherUser = userId && userId !== user.id;
      setIsViewingOtherUser(viewingOtherUser);
      if (viewingOtherUser && !isCurrentUserAdmin) {
        navigate('/perfil');
        return;
      }
      sessionStorage.setItem('currentUserId', targetUserId);
      const cachedProfile = getCachedProfile(targetUserId);
      if (cachedProfile) {
        setUserData(cachedProfile);
        setAvatarUrl(cachedProfile.avatar_url || null);
        setSuperiorEmpresaId(cachedProfile.superior_empresa_id || 'default');
        setFormData({
          nome: cachedProfile.nome,
          cargo: cachedProfile.cargo,
          departamento: cachedProfile.departamento,
          data_admissao: cachedProfile.data_admissao,
          carga_horaria: cachedProfile.carga_horaria
        });
        setLoading(false);
        setShowSkeleton(false);
        loadProfileFromDB(targetUserId, user.id, isCurrentUserAdmin, true);
        return;
      }
      setLoading(true);
      skeletonTimeout = setTimeout(() => {
        setShowSkeleton(true);
      }, 300);
      await loadProfileFromDB(targetUserId, user.id, isCurrentUserAdmin, false);
    } catch (error) {
      setLoading(false);
      setShowSkeleton(false);
    } finally {
      if (skeletonTimeout) clearTimeout(skeletonTimeout);
    }
  };
  const loadProfileFromDB = async (targetUserId, currentUserId, isCurrentUserAdmin, isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {}
      const {
        data: profile,
        error
      } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
      if (error && error.code !== 'PGRST116') {}
      let superiorEmpresaId = null;
      try {
        const {
          data: userEmpresasData
        } = await supabase.from('user_empresas').select(`
            empresa_id,
            empresas (
              id,
              superior_empresa_id
            )
          `).eq('user_id', targetUserId).limit(1).single();
        if (userEmpresasData?.empresas?.superior_empresa_id) {
          superiorEmpresaId = userEmpresasData.empresas.superior_empresa_id;
          setSuperiorEmpresaId(superiorEmpresaId);
        } else {
          superiorEmpresaId = 'default';
          setSuperiorEmpresaId('default');
        }
      } catch (err) {
        superiorEmpresaId = 'default';
        setSuperiorEmpresaId('default');
      }
      const userData = {
        email: profile?.email || '',
        nome: profile?.nome || '',
        cargo: profile?.cargo || '',
        departamento: profile?.departamento || '',
        data_admissao: profile?.data_admissao || getLocalDateString(),
        carga_horaria: profile?.carga_horaria || 40,
        user_id: targetUserId,
        role: profile?.role || 'user',
        superior_empresa_id: superiorEmpresaId,
        avatar_url: profile?.avatar_url || null
      };
      setUserData(userData);
      CacheService.set('profile', userData, targetUserId, 10 * 60 * 1000);
      if (profile?.avatar_url) {
        const avatarUrlToSet = profile.avatar_url.trim();
        if (avatarUrlToSet) {
          setAvatarUrl(avatarUrlToSet);
        }
      } else {
        setAvatarUrl(null);
      }
      setFormData({
        nome: userData.nome,
        cargo: userData.cargo,
        departamento: userData.departamento,
        data_admissao: userData.data_admissao,
        carga_horaria: userData.carga_horaria
      });
    } catch (error) {} finally {
      if (!isBackgroundUpdate) {
        setLoading(false);
        setShowSkeleton(false);
      }
    }
  };
  const loadStatistics = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const targetUserId = userId || user.id;
      const cachedStats = getCachedStatistics(targetUserId);
      if (cachedStats) {
        setStatistics(cachedStats);
        loadStatisticsFromDB(targetUserId);
        return;
      }
      await loadStatisticsFromDB(targetUserId);
    } catch (error) {}
  };
  const loadStatisticsFromDB = async targetUserId => {
    try {
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const formatarData = d => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const startOfMonth = formatarData(primeiroDia);
      const endOfMonth = formatarData(ultimoDia);
      const {
        data: hoursData
      } = await supabase.from('agendamento').select('entrada1, saida1, entrada2, saida2').eq('user_id', targetUserId).gte('data', startOfMonth).lte('data', endOfMonth);
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
      const {
        data: projectsData
      } = await supabase.from('projetos').select('id').neq('status', 'inativo');
      const stats = {
        horasTrabalhadas,
        saldoHoras,
        horasExtras,
        projetosAtivos: projectsData?.length || 0
      };
      setStatistics(stats);
      CacheService.set('profile_stats', stats, targetUserId, 10 * 60 * 1000);
    } catch (error) {}
  };
  const handleEdit = () => {
    setIsEditing(true);
  };
  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      nome: userData.nome,
      cargo: userData.cargo,
      departamento: userData.departamento,
      data_admissao: userData.data_admissao,
      carga_horaria: userData.carga_horaria
    });
    setNewPassword('');
    setConfirmPassword('');
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          showError('As senhas não coincidem.');
          setSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          showError('A senha deve ter no mínimo 6 caracteres.');
          setSaving(false);
          return;
        }
      }
      if (newPassword && newPassword === confirmPassword) {
        const {
          error: passwordError
        } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (passwordError) {
          showError('Erro ao atualizar senha: ' + passwordError.message);
          setSaving(false);
          return;
        }
      }
      const {
        data: existingProfile
      } = await supabase.from('profiles').select('id').eq('id', user.id).single();
      let result;
      if (existingProfile) {
        result = await supabase.from('profiles').update({
          nome: formData.nome,
          cargo: formData.cargo,
          departamento: formData.departamento,
          data_admissao: formData.data_admissao,
          carga_horaria: formData.carga_horaria
        }).eq('id', user.id);
      } else {
        result = await supabase.from('profiles').insert({
          id: user.id,
          nome: formData.nome,
          email: user.email,
          cargo: formData.cargo,
          departamento: formData.departamento,
          data_admissao: formData.data_admissao,
          carga_horaria: formData.carga_horaria
        });
      }
      if (result.error) {
        showError('Erro ao salvar perfil. Tente novamente.');
        return;
      }
      const updatedUserData = {
        ...userData,
        ...formData
      };
      setUserData(updatedUserData);
      const targetUserId = userId || user.id;
      CacheService.remove('profile', targetUserId);
      setNewPassword('');
      setConfirmPassword('');
      setIsEditing(false);
      showSuccess(newPassword ? 'Perfil e senha atualizados com sucesso!' : 'Perfil atualizado com sucesso!');
    } catch (error) {
      showError('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };
  const handleInputChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'carga_horaria' ? parseInt(value) || 0 : value
    }));
  };
  const handlePhotoUpload = async event => {
    try {
      setUploadingPhoto(true);
      const file = event.target.files[0];
      if (!file) {
        setUploadingPhoto(false);
        return;
      }
      if (!file.type || !file.type.startsWith('image/')) {
        showError('Por favor, selecione uma imagem válida.');
        setUploadingPhoto(false);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showError('A imagem deve ter no máximo 2MB.');
        setUploadingPhoto(false);
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
        setUploadingPhoto(false);
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
        setUploadingPhoto(false);
        return;
      }
      if (!uploadData || !uploadData.path) {
        showError('Upload concluído, mas não foi possível obter a URL da imagem.');
        setUploadingPhoto(false);
        return;
      }
      const {
        data: publicUrlData
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!publicUrlData || !publicUrlData.publicUrl) {
        showError('Erro ao obter URL pública da imagem.');
        setUploadingPhoto(false);
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
        setUploadingPhoto(false);
        return;
      }
      setAvatarUrl(newAvatarUrl);
      showSuccess('Foto atualizada com sucesso!');
    } catch (error) {
      showError('Ocorreu um erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
      if (event && event.target) {
        event.target.value = '';
      }
    }
  };
  const getInitials = name => {
    if (!name) return 'YT';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const formatDate = dateString => {
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
  if (showSkeleton && !userData) {
    return <MainLayout title="Perfil">
        <PerfilSkeleton />
      </MainLayout>;
  }
  if (!userData) {
    return <MainLayout title="Perfil">
        <PerfilSkeleton />
      </MainLayout>;
  }
  return <MainLayout title={isViewingOtherUser ? t('profile.title') : t('profile.title')} subtitle={isViewingOtherUser ? userData?.nome : t('profile.subtitle')}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-center mb-4 pb-3 border-b border-gray-200">
              <div className="text-center">
                <div className="relative inline-block">
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-md" onLoad={() => {}} onError={e => {}} /> : <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                      {getInitials(userData?.nome)}
                    </div>}
                  {!isViewingOtherUser && <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md cursor-pointer hover:bg-gray-100 transition-colors border-2 border-blue-600">
                      {uploadingPhoto ? <FiUpload className="w-4 h-4 text-blue-600 animate-pulse" /> : <FiCamera className="w-4 h-4 text-blue-600" />}
                      <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} className="hidden" />
                    </label>}
                </div>
                {!isViewingOtherUser && <p className="mt-2 text-xs text-gray-500">
                    Clique no ícone para alterar a foto
                  </p>}
                {uploadingPhoto && <p className="mt-1 text-xs text-blue-600">Enviando foto...</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="flex flex-col">
                <div className="mb-4">
                  <div>
                    {isEditing ? <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} placeholder="Nome completo" className="text-xl font-semibold text-gray-900 border-b-2 border-blue-500 focus:outline-none w-full mb-1" /> : <h2 className="text-xl font-semibold text-gray-900">
                        {userData?.nome || 'Nome não definido'}
                      </h2>}
                    {isEditing && isAdmin ? <input type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} placeholder="Cargo" className="text-sm text-gray-600 border-b border-gray-300 focus:outline-none w-full mt-1" /> : <p className="text-sm text-gray-600 mt-1">{userData?.cargo || 'Cargo não definido'}</p>}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                      <FiUser className="w-3.5 h-3.5" /> Email
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{userData?.email}</p>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                      <FiBriefcase className="w-3.5 h-3.5" /> {t('profile.position')}
                    </label>
                    {isEditing && isAdmin ? <input type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} placeholder={t('profile.positionPlaceholder')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" /> : <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                        {userData?.cargo || t('profile.positionNotDefined')}
                      </p>}
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                      <FiBriefcase className="w-3.5 h-3.5" /> {t('profile.department')}
                    </label>
                    {isEditing ? <input type="text" name="departamento" value={formData.departamento} onChange={handleInputChange} placeholder={t('profile.departmentPlaceholder')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" /> : <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                        {userData?.departamento || t('profile.departmentNotDefined')}
                      </p>}
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                      <FiCalendar className="w-3.5 h-3.5" /> {t('profile.admissionDate')}
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {formatDate(userData?.data_admissao)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                      <FiUser className="w-3.5 h-3.5" /> {t('profile.newPassword')}
                    </label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={!isEditing} placeholder={isEditing ? t('profile.newPasswordPlaceholder') : t('profile.passwordMask')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" />
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                      <FiUser className="w-3.5 h-3.5" /> {t('profile.confirmPassword')}
                    </label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={!isEditing} placeholder={isEditing ? t('profile.confirmPasswordPlaceholder') : t('profile.passwordMask')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" />
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                      <FiClock className="w-3.5 h-3.5" /> {t('profile.workSchedule')}
                    </label>
                    {isEditing && isAdmin ? <input type="number" name="carga_horaria" value={formData.carga_horaria} onChange={handleInputChange} min="1" max="60" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" /> : <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                        {userData?.carga_horaria || 40}{t('profile.perWeek')}
                      </p>}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('profile.monthStats')}</h3>
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-700 mb-1">{t('profile.hoursWorked')}</p>
                    <p className="text-2xl font-bold text-blue-600">{statistics.horasTrabalhadas}</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                    <p className="text-xs font-medium text-orange-700 mb-1">{t('profile.overtimeHours')}</p>
                    <p className="text-2xl font-bold text-orange-600">{statistics.horasExtras || '0h 0m'}</p>
                  </div>
                  
                  <div className={`bg-gradient-to-r ${statistics.saldoHoras.startsWith('+') ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'} p-4 rounded-lg border`}>
                    <p className={`text-xs font-medium ${statistics.saldoHoras.startsWith('+') ? 'text-green-700' : 'text-red-700'} mb-1`}>
                      {t('profile.hoursBalance')}
                    </p>
                    <p className={`text-2xl font-bold ${statistics.saldoHoras.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {statistics.saldoHoras}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <p className="text-xs font-medium text-purple-700 mb-1">{t('profile.activeProjects')}</p>
                    <p className="text-2xl font-bold text-purple-600">{statistics.projetosAtivos}</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 italic">
                    {t('profile.statsNote')}
                  </p>
                </div>
              </div>
            </div>

            {!isViewingOtherUser && <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                {isEditing ? <>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                      {saving ? t('profile.savingButton') : t('profile.saveButton')}
                    </button>
                    <button onClick={handleCancel} disabled={saving} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      <FiX className="w-4 h-4" />
                      {t('profile.cancelButton')}
                    </button>
                  </> : <button onClick={handleEdit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg">
                    <FiEdit2 className="w-4 h-4" />
                    {t('profile.editProfileButton')}
                  </button>}
              </div>}
          </div>
        </div>
      </div>
    </MainLayout>;
}
export default Perfil;
