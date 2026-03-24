import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import DashboardCards from './components/ui/DashboardCards';
import TimeRecordsSummary from './components/TimeRecordsSummary';
import ExportPDFModal from './components/ExportPDFModal';
import ExportDataModal from './components/ExportDataModal';
import ProjectsLoadingSkeleton from './components/ui/ProjectCardSkeleton';
import CacheService from './services/CacheService';
import jsPDF from 'jspdf';
import { useTimeTracking } from './hooks/useTimeTracking';
import { useLanguage } from './hooks/useLanguage.jsx';
import { supabase } from './config/supabase';
import { formatDate } from './utils/dateUtils';
import { FiTarget, FiBarChart2, FiRefreshCw, FiTrendingUp, FiFile, FiFileText, FiGrid, FiCheckCircle, FiChevronLeft, FiChevronRight, FiLoader, FiX, FiUser, FiUserCheck, FiCalendar, FiDownload } from 'react-icons/fi';
function App() {
  const {
    t
  } = useLanguage();
  const getCachedProjects = () => {
    try {
      const userId = sessionStorage.getItem('currentUserId');
      if (userId) {
        const cached = CacheService.get('dashboard_projects', userId);
        if (cached) {
          return cached;
        }
      }
    } catch (e) {}
    return [];
  };
  const getCachedAdminStatus = () => {
    try {
      const userId = sessionStorage.getItem('currentUserId');
      if (userId) {
        const cached = CacheService.get('user_is_admin', userId);
        if (cached !== null && cached !== undefined) {
          return cached;
        }
      }
    } catch (e) {}
    return false;
  };
  const initialProjects = getCachedProjects();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsWithHours, setProjectsWithHours] = useState(initialProjects);
  const [loadingProjects, setLoadingProjects] = useState(initialProjects.length === 0);
  const [showProjectsSkeleton, setShowProjectsSkeleton] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [fadeTransition, setFadeTransition] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isAdmin, setIsAdmin] = useState(getCachedAdminStatus());
  const [modalExportPDF, setModalExportPDF] = useState(false);
  const [modalExportCSV, setModalExportCSV] = useState(false);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
        if (!user) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 500);
          return;
        }
        setCurrentUserId(user.id);
        sessionStorage.setItem('currentUserId', user.id);
        const hasCachedProjects = projectsWithHours && projectsWithHours.length > 0;
        if (hasCachedProjects) {
          setLoadingProjects(false);
          setShowProjectsSkeleton(false);
        }
        const {
          data: profile
        } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const isAdminUser = profile?.role === 'admin';
        setIsAdmin(isAdminUser);
        CacheService.set('user_is_admin', isAdminUser, user.id, 10 * 60 * 1000);
      } catch (error) {
        setLoadingProjects(false);
        setShowProjectsSkeleton(false);
      }
    };
    checkAuth();
  }, []);
  const {
    dashboardData,
    weeklyData,
    loading,
    error,
    userData,
    timeRecords,
    refetch
  } = useTimeTracking();
  const horasTrabalhadasData = weeklyData || [];
  useEffect(() => {
    if (!currentUserId) return;
    loadProjects();
  }, [currentUserId]);
  const loadProjects = async () => {
    let skeletonTimeout = null;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const hasCachedData = projectsWithHours && projectsWithHours.length > 0;
      if (hasCachedData) {} else if (!loadingProjects) {
        setLoadingProjects(true);
        skeletonTimeout = setTimeout(() => {
          setShowProjectsSkeleton(true);
        }, 300);
      }
      const {
        data: userProfile
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
      let query = supabase.from('projetos').select(`
            *,
            empresas (
              nome
            )
          `).eq('status', 'ativo').order('nome');
      if (userProfile?.superior_empresa_id) {
        query = query.eq('superior_empresa_id', userProfile.superior_empresa_id);
      }
      const {
        data: projectsData,
        error: projectsError
      } = await query;
      if (projectsError) {
        setLoadingProjects(false);
        setShowProjectsSkeleton(false);
        if (skeletonTimeout) clearTimeout(skeletonTimeout);
        return;
      }
      setProjects(projectsData || []);
      if (!user) {
        setProjectsWithHours(projectsData || []);
        setLoadingProjects(false);
        setShowProjectsSkeleton(false);
        if (skeletonTimeout) clearTimeout(skeletonTimeout);
        return;
      }
      const {
        data: hoursData,
        error: hoursError
      } = await supabase.from('agendamento').select('id, data, entrada1, saida1, entrada2, saida2, user_id, projeto_id, status').eq('user_id', user.id);
      if (hoursError) {
        setProjectsWithHours(projectsData || []);
        setLoadingProjects(false);
        return;
      }
      if (!hoursData || hoursData.length === 0) {
        setProjectsWithHours(projectsData || []);
        setLoadingProjects(false);
        return;
      }
      const calculateHours = apt => {
        let totalMinutos = 0;
        if (apt.entrada1 && apt.saida1) {
          const entrada1 = new Date(`2000-01-01T${apt.entrada1}`);
          const saida1 = new Date(`2000-01-01T${apt.saida1}`);
          totalMinutos += Math.floor((saida1 - entrada1) / (1000 * 60));
        }
        if (apt.entrada2 && apt.saida2) {
          const entrada2 = new Date(`2000-01-01T${apt.entrada2}`);
          const saida2 = new Date(`2000-01-01T${apt.saida2}`);
          totalMinutos += Math.floor((saida2 - entrada2) / (1000 * 60));
        }
        return totalMinutos / 60;
      };
      const projectsWithCalculatedHours = (projectsData || []).map(project => {
        const projectAppointments = hoursData.filter(apt => apt.projeto_id === project.id);
        const approvedHours = projectAppointments.filter(apt => apt.status === 'A').reduce((sum, apt) => sum + calculateHours(apt), 0);
        const pendingHours = projectAppointments.filter(apt => apt.status === 'P').reduce((sum, apt) => sum + calculateHours(apt), 0);
        const totalHours = approvedHours + pendingHours;
        const horasRestantes = (project.horas_estimadas || 0) - totalHours;
        return {
          ...project,
          horasTrabalhadas: approvedHours.toFixed(1),
          horasPendentesAprovacao: pendingHours.toFixed(1),
          horasTotais: totalHours.toFixed(1),
          horasPendentes: horasRestantes > 0 ? horasRestantes.toFixed(1) : '0.0'
        };
      });
      setProjectsWithHours(projectsWithCalculatedHours);
      if (user && user.id) {
        CacheService.set('dashboard_projects', projectsWithCalculatedHours, user.id, 10 * 60 * 1000);
      }
    } catch (error) {} finally {
      if (skeletonTimeout) clearTimeout(skeletonTimeout);
      setLoadingProjects(false);
      setShowProjectsSkeleton(false);
    }
  };
  useEffect(() => {
    const savedProject = localStorage.getItem('selectedProject');
    if (savedProject) {
      setSelectedProject(JSON.parse(savedProject));
    }
  }, []);
  useEffect(() => {
    if (selectedProject && projectsWithHours.length > 0) {
      const updatedProject = projectsWithHours.find(p => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
        localStorage.setItem('selectedProject', JSON.stringify(updatedProject));
      }
    }
  }, [projectsWithHours]);
  const handleSelectProject = project => {
    setSelectedProject(project);
    localStorage.setItem('selectedProject', JSON.stringify(project));
    showToastMessage(t('dashboard.projectSelected').replace('{name}', project.nome));
  };
  const clearSelectedProject = () => {
    setSelectedProject(null);
    localStorage.removeItem('selectedProject');
    showToastMessage('Projeto desmarcado');
  };
  const showToastMessage = message => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Horas Trabalhadas', 20, 20);
    doc.setFontSize(12);
    horasTrabalhadasData.forEach((item, index) => {
      const yPos = 40 + index * 10;
      const texto = `${item.dia}: ${item.horas} (${item.entrada} - ${item.saida})`;
      doc.text(texto, 20, yPos);
    });
    doc.text('Total: 39h 21m', 20, 40 + horasTrabalhadasData.length * 10);
    doc.save('relatorio-horas.pdf');
    showToastMessage('Relatório PDF gerado com sucesso!');
  };
  const CARDS_PER_PAGE = 4;
  const totalPages = Math.ceil(projectsWithHours.length / CARDS_PER_PAGE);
  const startIndex = currentPage * CARDS_PER_PAGE;
  const endIndex = startIndex + CARDS_PER_PAGE;
  const currentProjects = projectsWithHours.slice(startIndex, endIndex);
  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setFadeTransition(true);
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        setFadeTransition(false);
      }, 150);
    }
  };
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setFadeTransition(true);
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        setFadeTransition(false);
      }, 150);
    }
  };
  return <MainLayout title="Dashboard" subtitle={t('common.systemManagement')}>
      <div className="space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              <div className="flex items-center">
                <FiX className="mr-2 w-5 h-5" />
                <div>
                  <div className="font-medium">Erro ao carregar dados</div>
                  <div className="text-sm mt-1">{error}</div>
                  <button onClick={() => window.location.reload()} className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors">
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>}

          {!loading && !error && <>
              <DashboardCards saldoHoras={dashboardData?.saldoHoras || '+00:00'} horasHoje={dashboardData?.horasHoje || '00:00'} horasPendentes={(() => {
          const horasDecimais = parseFloat(selectedProject?.horasPendentesAprovacao || '0');
          const horas = Math.floor(horasDecimais);
          const minutos = Math.round((horasDecimais - horas) * 60);
          return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        })()} projetoAtual={selectedProject?.nome || dashboardData?.projetoAtual || 'Nenhum projeto'} status={dashboardData?.status || 'Offline'} isWorking={dashboardData?.isWorking || false} />
              
              {selectedProject && selectedProject.horas_estimadas && <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.hoursProgress')}</h3>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        <span className="text-blue-600 font-semibold">{selectedProject.horasTrabalhadas || '0.0'}h {t('dashboard.approvedHours')}</span>
                        {parseFloat(selectedProject.horasPendentesAprovacao || '0') > 0 && <> + <span className="text-yellow-600 font-semibold">{selectedProject.horasPendentesAprovacao}h {t('dashboard.pending').toLowerCase()}</span></>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('projects.goal')}: {selectedProject.horas_estimadas}h
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    {(() => {
              const horasAprovadas = parseFloat(selectedProject.horasTrabalhadas || '0');
              const horasPendentes = parseFloat(selectedProject.horasPendentesAprovacao || '0');
              const horasEstimadas = parseFloat(selectedProject.horas_estimadas || 1);
              const porcentagemAprovada = Math.min(horasAprovadas / horasEstimadas * 100, 100);
              const porcentagemPendente = Math.min(horasPendentes / horasEstimadas * 100, 100 - porcentagemAprovada);
              return <div className="flex h-full w-full">
                          {porcentagemAprovada > 0 && <div className="bg-blue-500 h-3 transition-all duration-500" style={{
                  width: `${porcentagemAprovada}%`
                }} title={`${horasAprovadas}h ${t('dashboard.approvedHours')}`}></div>}
                          {porcentagemPendente > 0 && <div className="bg-yellow-500 h-3 transition-all duration-500" style={{
                  width: `${porcentagemPendente}%`
                }} title={`${horasPendentes}h ${t('dashboard.pending').toLowerCase()}`}></div>}
                        </div>;
            })()}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-gray-600">{t('dashboard.approved_plural')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span className="text-gray-600">{t('dashboard.pending')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-200 rounded"></div>
                        <span className="text-gray-600">{t('dashboard.remaining')}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {(() => {
                const horasTotais = parseFloat(selectedProject.horasTotais || '0');
                const horasEstimadas = parseFloat(selectedProject.horas_estimadas || 1);
                const porcentagem = Math.round(horasTotais / horasEstimadas * 100);
                return `${porcentagem}% ${t('dashboard.ofTotal')}`;
              })()}
                    </p>
                  </div>
                </div>}
            </>}

          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiTarget className="w-5 h-5" />
                {t('dashboard.selectProject')}
              </h3>
              {!loadingProjects && projectsWithHours.length > CARDS_PER_PAGE && <div className="text-sm text-gray-500">
                  {t('dashboard.page')} {currentPage + 1} {t('dashboard.of')} {totalPages}
                </div>}
            </div>
            
            {showProjectsSkeleton ? <ProjectsLoadingSkeleton count={4} /> : currentProjects.length > 0 ? <>
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-150 ${fadeTransition ? 'opacity-0' : 'opacity-100'}`}>
                  {currentProjects.map(project => <div key={project.id} onClick={() => handleSelectProject(project)} className={`cursor-pointer border-2 rounded-lg p-4 transition-all hover:border-blue-300 hover:shadow-md relative ${selectedProject?.id === project.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200'}`} style={{
              minWidth: '20px',
              maxWidth: '320px'
            }}>
                          <div className="absolute top-3 right-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedProject?.id === project.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}`}>
                              {selectedProject?.id === project.id && <FiCheckCircle className="w-4 h-4 text-white" />}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-3 pr-8">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                  backgroundColor: project.cor_identificacao || '#3B82F6'
                }}></div>
                            <h4 className="font-semibold text-gray-900 text-sm truncate flex-1">
                              {project.nome}
                            </h4>
                          </div>
                          
                          {project.descricao && <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                              {project.descricao}
                            </p>}
                          
                          {project.empresas?.nome && <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {project.empresas.nome}
                            </p>}
                          
                          <div className="space-y-2 pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">{t('projects.workedHours')}:</span>
                              <span className="font-semibold text-green-600">{project.horasTrabalhadas || '0.0'}h</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">{t('projects.pendingHours')}:</span>
                              <span className="font-semibold text-orange-600">{project.horasPendentes || '0.0'}h</span>
                            </div>
                            {project.horas_estimadas && <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">{t('projects.totalGoal')}:</span>
                                <span className="font-semibold text-blue-600">{project.horas_estimadas}h</span>
                              </div>}
                          </div>
                        </div>)}
                </div>

                {projectsWithHours.length > CARDS_PER_PAGE && <div className="flex items-center justify-center gap-4 mt-6">
                    <button onClick={handlePrevPage} disabled={currentPage === 0} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentPage === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'}`}>
                      <FiChevronLeft className="w-5 h-5" />
                      Anterior
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {Array.from({
                length: totalPages
              }).map((_, index) => <button key={index} onClick={() => {
                setFadeTransition(true);
                setTimeout(() => {
                  setCurrentPage(index);
                  setFadeTransition(false);
                }, 200);
              }} className={`w-2 h-2 rounded-full transition-all ${currentPage === index ? 'bg-blue-600 w-8' : 'bg-gray-300 hover:bg-gray-400'}`} />)}
                    </div>

                    <button onClick={handleNextPage} disabled={currentPage === totalPages - 1} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentPage === totalPages - 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'}`}>
                      {t('dashboard.next')}
                      <FiChevronRight className="w-5 h-5" />
                    </button>
                  </div>}
              </> : <div className="text-center py-8 text-gray-500">
                <FiTarget className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="mb-2">{t('dashboard.noActiveProjects')}</p>
                <Link to="/projeto" className="text-blue-600 hover:underline text-sm">
                  {t('dashboard.createNewProject')}
                </Link>
              </div>}
          </div>

          <TimeRecordsSummary timeRecords={timeRecords} onRefresh={refetch} loading={loading} error={error} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.weekHours')}</h3>

              {error ? <div className="flex items-center justify-center h-32 text-red-500">
                  <span>Erro ao carregar gráfico</span>
                </div> : weeklyData && weeklyData.length > 0 ? <>
                  <div className="space-y-3 mb-4">
                    {(() => {
                const maxHoursInWeek = Math.max(...weeklyData.map(item => {
                  const [hours, mins] = item.horas.split(':');
                  return parseInt(hours) + parseInt(mins) / 60;
                }), 1);
                return weeklyData.map((item, index) => {
                  const [hours, mins] = item.horas.split(':');
                  const totalHours = parseInt(hours) + parseInt(mins) / 60;
                  if (totalHours === 0) {
                    return <div key={index} className="flex items-center gap-4">
                              <div className="w-20 flex-shrink-0">
                                <span className="text-sm text-gray-600">{item.dia}</span>
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-200 rounded-full h-2"></div>
                              </div>
                              <div className="w-12 flex-shrink-0 text-right">
                                <span className="text-sm font-medium text-gray-900">0:00h</span>
                              </div>
                            </div>;
                  }
                  const normalWorkHours = 8;
                  const workedHours = Math.min(totalHours, normalWorkHours);
                  const overtimeHours = Math.max(totalHours - normalWorkHours, 0);
                  const underHours = Math.max(normalWorkHours - totalHours, 0);
                  const workedPercent = workedHours / maxHoursInWeek * 100;
                  const overtimePercent = overtimeHours / maxHoursInWeek * 100;
                  const underPercent = underHours / maxHoursInWeek * 100;
                  const isPending = item.status === 'P';
                  const isBelowTarget = totalHours < normalWorkHours;
                  let normalBarColor = 'bg-blue-500';
                  if (isPending) {
                    normalBarColor = 'bg-yellow-500';
                  } else if (item.isToday) {
                    normalBarColor = 'bg-green-500';
                  }
                  return <div key={index} className="flex items-center gap-4">
                            <div className="w-20 flex-shrink-0">
                              <span className={`text-sm ${isPending ? 'text-yellow-600 font-semibold' : item.isToday ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                                {item.dia} {item.isToday && `(${t('dashboard.today').toLowerCase()})`}
                              </span>
                            </div>

                            <div className="flex-1">
                              <div className="bg-gray-200 rounded-full h-2 overflow-hidden flex">
                                {workedHours > 0 && <div className={`h-2 ${normalBarColor}`} style={{
                          width: `${workedPercent}%`
                        }} title={`${workedHours.toFixed(1)}h trabalhadas`}></div>}
                                
                                {overtimeHours > 0 && <div className="h-2 bg-orange-500" style={{
                          width: `${overtimePercent}%`
                        }} title={`${overtimeHours.toFixed(1)}h extras`}></div>}
                                
                                {isBelowTarget && underHours > 0 && <div className="h-2" style={{
                          width: `${underPercent}%`,
                          backgroundImage: `repeating-linear-gradient(
                                        45deg,
                                        ${isPending ? '#eab308' : item.isToday ? '#22c55e' : '#3b82f6'},
                                        ${isPending ? '#eab308' : item.isToday ? '#22c55e' : '#3b82f6'} 2px,
                                        transparent 2px,
                                        transparent 5px
                                      )`
                        }} title={`${underHours.toFixed(1)}h abaixo da meta`}></div>}
                              </div>
                            </div>

                            <div className="w-12 flex-shrink-0 text-right">
                              <span className={`text-sm font-medium ${isPending ? 'text-yellow-600' : item.isToday ? 'text-green-600' : 'text-gray-900'}`}>
                                {item.horas}h
                              </span>
                            </div>
                          </div>;
                });
              })()}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-xs text-gray-600">{t('dashboard.approved')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span className="text-xs text-gray-600">{t('dashboard.pending')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-xs text-gray-600">{t('dashboard.today')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      <span className="text-xs text-gray-600">{t('dashboard.overtime')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{
                  backgroundImage: `repeating-linear-gradient(
                            45deg,
                            #3b82f6,
                            #3b82f6 2px,
                            transparent 2px,
                            transparent 5px
                          )`
                }}></div>
                      <span className="text-xs text-gray-600">{t('dashboard.belowGoal')}</span>
                    </div>
                  </div>
                </> : <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <FiTrendingUp className="text-gray-400 w-12 h-12 mx-auto mb-2" />
                    <div>{t('dashboard.noHoursData')}</div>
                    <div className="text-sm text-gray-400 mt-1">{t('dashboard.registerFirstEntry')}</div>
                  </div>
                </div>}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h3>
              <div className="space-y-3">
                <Link to="/formulario-ponto" className="flex items-center p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white mr-3">
                    <FiFileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-red-700">{t('dashboard.registerTime')}</p>
                    <p className="text-sm text-gray-500">{t('dashboard.registerTimeDesc')}</p>
                  </div>
                </Link>
                
                {isAdmin && <Link to="/painel-admin" className="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white mr-3">
                      <FiUserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-green-700">{t('menu.adminPanel')}</p>
                      <p className="text-sm text-gray-500">{t('dashboard.adminPanelDesc')}</p>
                    </div>
                  </Link>}
                
                <Link to="/historico" className="flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white mr-3">
                    <FiCalendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-purple-700">{t('menu.history')}</p>
                    <p className="text-sm text-gray-500">{t('dashboard.historyDesc')}</p>
                  </div>
                </Link>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('dashboard.exportReports')}</h4>
                <div className="space-y-2">
                  <button onClick={() => setModalExportPDF(true)} className="flex items-center w-full p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white mr-3 text-sm">
                      <FiDownload className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{t('dashboard.exportPDF')}</p>
                      <p className="text-xs text-gray-500">{t('dashboard.exportPDFDesc')}</p>
                    </div>
                  </button>
                  
                  <button onClick={() => setModalExportCSV(true)} className="flex items-center w-full p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center text-white mr-3 text-sm">
                      <FiGrid className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-green-700">{t('dashboard.exportCSV')}</p>
                      <p className="text-xs text-gray-500">{t('dashboard.exportCSVDesc')}</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentActivities')}</h3>

            {!loading && !error && timeRecords?.length > 0 ? <div className="space-y-3">
                {timeRecords.slice(-5).reverse().map((record, index) => <div key={record.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${record.entrada1 ? 'bg-green-500' : record.saida1 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <span className="text-sm text-gray-900">
                        {record.entrada1 ? t('dashboard.newEntry') : record.saida1 ? 'Saída registrada' : record.entrada2 ? 'Entrada 2 registrada' : record.saida2 ? 'Saída 2 registrada' : 'Registro de ponto'}
                        {record.observacao && ` - ${record.observacao}`}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(record.data, 'DD/MM/YYYY')}
                    </span>
                  </div>)}

                {timeRecords.length === 0 && <div className="text-center py-4 text-gray-500">
                    {t('dashboard.noTimeRecordsFound')}
                  </div>}
              </div> : <div className="flex items-center justify-center h-32 text-gray-500">
                {loading ? t('dashboard.loadingActivities') : t('dashboard.noActivitiesRegistered')}
              </div>}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {(() => {
                const totalMinutes = weeklyData?.reduce((total, item) => {
                  const [hours, minutes] = item.horas.split(':').map(Number);
                  return total + hours * 60 + minutes;
                }, 0) || 0;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return `${hours}h ${minutes}m`;
              })()}
                </p>
                <p className="text-sm text-gray-500">{t('dashboard.hoursThisWeek')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {userData?.carga_horaria ? `${userData.carga_horaria}h${t('dashboard.perWeek')}` : `40h${t('dashboard.perWeek')}`}
                </p>
                <p className="text-sm text-gray-500">{t('dashboard.workload')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {(() => {
                const totalMinutes = weeklyData?.reduce((total, item) => {
                  const [hours, minutes] = item.horas.split(':').map(Number);
                  return total + hours * 60 + minutes;
                }, 0) || 0;
                const expectedMinutes = (userData?.carga_horaria || 40) * 60;
                const percentage = expectedMinutes > 0 ? Math.round(totalMinutes / expectedMinutes * 100) : 0;
                return `${percentage}%`;
              })()}
                </p>
                <p className="text-sm text-gray-500">{t('dashboard.weekGoal')}</p>
              </div>
            </div>
          </div>
        
        {showToast && <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5" />
              {toastMessage}
            </div>
          </div>}

        <ExportPDFModal isOpen={modalExportPDF} onClose={() => setModalExportPDF(false)} isAdmin={isAdmin} />

        <ExportDataModal isOpen={modalExportCSV} onClose={() => setModalExportCSV(false)} isAdmin={isAdmin} />
      </div>
    </MainLayout>;
}
export default App;
