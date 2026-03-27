import { supabase } from '../config/supabase';

const TIPOS_AUSENCIA = {
  falta_injustificada: { label: 'Falta Injustificada', requerAnexo: false },
  atestado_medico: { label: 'Atestado Médico', requerAnexo: true },
  licenca_maternidade: { label: 'Licença Maternidade', requerAnexo: true },
  licenca_paternidade: { label: 'Licença Paternidade', requerAnexo: true },
  licenca_casamento: { label: 'Licença Casamento', requerAnexo: true },
  licenca_obito: { label: 'Licença Óbito', requerAnexo: true },
  ferias: { label: 'Férias', requerAnexo: false },
  folga_compensatoria: { label: 'Folga Compensatória', requerAnexo: false },
  abono: { label: 'Abono', requerAnexo: false },
  outros: { label: 'Outros', requerAnexo: false }
};

class AusenciaService {
  static getTiposAusencia() {
    return TIPOS_AUSENCIA;
  }

  static async criarAusencia({ userId, dataInicio, dataFim, tipo, justificativa, anexoFile, superiorEmpresaId }) {
    try {
      let anexoUrl = null;

      if (anexoFile) {
        const caminho = `ausencias/${userId}/${Date.now()}_${anexoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(caminho, anexoFile, { contentType: anexoFile.type });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(caminho);
          anexoUrl = urlData?.publicUrl || null;
        }
      }

      const { data, error } = await supabase
        .from('ausencias')
        .insert([{
          user_id: userId,
          data_inicio: dataInicio,
          data_fim: dataFim,
          tipo,
          justificativa: justificativa || null,
          anexo_url: anexoUrl,
          status: 'pendente',
          superior_empresa_id: superiorEmpresaId
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async buscarAusencias(userId, { dataInicio, dataFim, status } = {}) {
    try {
      let query = supabase
        .from('ausencias')
        .select('*, profiles:aprovado_por(nome)')
        .eq('user_id', userId)
        .order('data_inicio', { ascending: false });

      if (dataInicio) query = query.gte('data_inicio', dataInicio);
      if (dataFim) query = query.lte('data_fim', dataFim);
      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static async buscarAusenciasAdmin(superiorEmpresaId, { status } = {}) {
    try {
      let query = supabase
        .from('ausencias')
        .select('*, profiles:user_id(nome, email, departamento)')
        .eq('superior_empresa_id', superiorEmpresaId)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static async aprovarAusencia(ausenciaId, adminId) {
    try {
      const { error } = await supabase
        .from('ausencias')
        .update({
          status: 'aprovada',
          aprovado_por: adminId,
          aprovado_em: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ausenciaId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async rejeitarAusencia(ausenciaId, adminId, motivo) {
    try {
      const { error } = await supabase
        .from('ausencias')
        .update({
          status: 'rejeitada',
          aprovado_por: adminId,
          aprovado_em: new Date().toISOString(),
          motivo_rejeicao: motivo,
          updated_at: new Date().toISOString()
        })
        .eq('id', ausenciaId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async buscarFeriados(ano, superiorEmpresaId = null) {
    try {
      let query = supabase
        .from('feriados')
        .select('*')
        .gte('data', `${ano}-01-01`)
        .lte('data', `${ano}-12-31`)
        .order('data', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      let feriados = data || [];
      if (superiorEmpresaId) {
        feriados = feriados.filter(f =>
          f.tipo === 'nacional' ||
          f.superior_empresa_id === superiorEmpresaId ||
          !f.superior_empresa_id
        );
      }

      return { success: true, data: feriados };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static async criarFeriado({ data, nome, tipo, estado, cidade, superiorEmpresaId, recorrente }) {
    try {
      const { data: feriado, error } = await supabase
        .from('feriados')
        .insert([{
          data,
          nome,
          tipo,
          estado: estado || null,
          cidade: cidade || null,
          superior_empresa_id: superiorEmpresaId || null,
          recorrente: recorrente || false
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: feriado };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async verificarAusenciaNodia(userId, data) {
    try {
      const { data: ausencias, error } = await supabase
        .from('ausencias')
        .select('id, tipo, status')
        .eq('user_id', userId)
        .lte('data_inicio', data)
        .gte('data_fim', data)
        .in('status', ['pendente', 'aprovada']);

      if (error) throw error;
      return ausencias && ausencias.length > 0 ? ausencias[0] : null;
    } catch (error) {
      return null;
    }
  }

  static async gerarAusenciasAutomaticas(superiorEmpresaId, diasRetroativos = 7) {
    try {
      const { data: funcionarios } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('superior_empresa_id', superiorEmpresaId)
        .eq('is_active', true);

      if (!funcionarios || funcionarios.length === 0) return { geradas: 0 };

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      let geradas = 0;

      for (let d = 1; d <= diasRetroativos; d++) {
        const diaAlvo = new Date(hoje);
        diaAlvo.setDate(hoje.getDate() - d);

        const diaSemana = diaAlvo.getDay();
        if (diaSemana === 0 || diaSemana === 6) continue;

        const dataStr = diaAlvo.toISOString().split('T')[0];

        const ausenciaExistenteNodia = await this.verificarFeriadoNoDia(dataStr, superiorEmpresaId);
        if (ausenciaExistenteNodia) continue;

        for (const funcionario of funcionarios) {
          const ausenciaJaExiste = await this.verificarAusenciaNodia(funcionario.id, dataStr);
          if (ausenciaJaExiste) continue;

          const temRegistroPonto = await this.verificarRegistroPontoNoDia(funcionario.id, dataStr);
          if (temRegistroPonto) continue;

          await supabase.from('ausencias').insert([{
            user_id: funcionario.id,
            data_inicio: dataStr,
            data_fim: dataStr,
            tipo: 'falta_injustificada',
            justificativa: 'Gerada automaticamente — sem registro de ponto',
            status: 'pendente',
            superior_empresa_id: superiorEmpresaId
          }]);
          geradas++;
        }
      }

      return { success: true, geradas };
    } catch (error) {
      return { success: false, error: error.message, geradas: 0 };
    }
  }

  static async verificarRegistroPontoNoDia(userId, data) {
    try {
      const { data: jornadas } = await supabase
        .from('jornadas')
        .select('id')
        .eq('user_id', userId)
        .eq('data', data)
        .limit(1);

      if (jornadas && jornadas.length > 0) return true;

      const { data: agendamentos } = await supabase
        .from('agendamento')
        .select('id')
        .eq('user_id', userId)
        .eq('data', data)
        .neq('status', 'R')
        .limit(1);

      return agendamentos && agendamentos.length > 0;
    } catch {
      return false;
    }
  }

  static async verificarFeriadoNoDia(data, superiorEmpresaId) {
    try {
      const { data: feriados } = await supabase
        .from('feriados')
        .select('id')
        .eq('data', data);

      if (!feriados || feriados.length === 0) return false;

      return feriados.some(f =>
        !f.superior_empresa_id ||
        f.superior_empresa_id === superiorEmpresaId
      );
    } catch {
      return false;
    }
  }

  static calcularDiasAusencia(dataInicio, dataFim) {
    const inicio = new Date(dataInicio + 'T00:00:00');
    const fim = new Date(dataFim + 'T00:00:00');
    let dias = 0;

    const current = new Date(inicio);
    while (current <= fim) {
      const diaSemana = current.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        dias++;
      }
      current.setDate(current.getDate() + 1);
    }
    return dias;
  }
}

export default AusenciaService;
