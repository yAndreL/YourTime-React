import { supabase } from '../config/supabase';
import CalculoTrabalhistaService from './CalculoTrabalhistaService';

class BatidaService {
  static async registrarBatida({ userId, tipo, latitude, longitude, precisaoGps, fotoUrl, projetoId, empresaId, superiorEmpresaId, observacao }) {
    try {
      const batida = {
        user_id: userId,
        tipo,
        timestamp_servidor: new Date().toISOString(),
        timestamp_cliente: new Date().toISOString(),
        latitude: latitude || null,
        longitude: longitude || null,
        precisao_gps: precisaoGps || null,
        foto_url: fotoUrl || null,
        dispositivo: navigator.userAgent?.substring(0, 255) || null,
        retroativo: false,
        observacao: observacao || null,
        projeto_id: projetoId || null,
        empresa_id: empresaId || null,
        superior_empresa_id: superiorEmpresaId || null
      };

      const { data, error } = await supabase
        .from('batidas')
        .insert([batida])
        .select()
        .single();

      if (error) throw error;

      await this.atualizarJornada(userId, superiorEmpresaId, projetoId, empresaId);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async buscarBatidasDoDia(userId, data = null) {
    try {
      const dataAlvo = data || new Date().toISOString().split('T')[0];

      const { data: batidas, error } = await supabase
        .from('batidas')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp_servidor', `${dataAlvo}T00:00:00`)
        .lt('timestamp_servidor', `${dataAlvo}T23:59:59.999`)
        .order('timestamp_servidor', { ascending: true });

      if (error) throw error;
      return { success: true, data: batidas || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static async buscarJornadaDoDia(userId, data = null) {
    try {
      const dataAlvo = data || new Date().toISOString().split('T')[0];

      const { data: jornada, error } = await supabase
        .from('jornadas')
        .select('*')
        .eq('user_id', userId)
        .eq('data', dataAlvo)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data: jornada };
    } catch (error) {
      return { success: false, error: error.message, data: null };
    }
  }

  static determinarEstadoJornada(batidas) {
    if (!batidas || batidas.length === 0) {
      return { estado: 'nao_iniciada', proximaBatida: 'entrada' };
    }

    const ultimaBatida = batidas[batidas.length - 1];

    switch (ultimaBatida.tipo) {
      case 'entrada':
        return { estado: 'trabalhando', proximaBatida: 'pausa' };
      case 'pausa':
        return { estado: 'em_pausa', proximaBatida: 'retorno' };
      case 'retorno':
        return { estado: 'trabalhando', proximaBatida: 'pausa' };
      case 'saida':
        return { estado: 'encerrada', proximaBatida: null };
      default:
        return { estado: 'nao_iniciada', proximaBatida: 'entrada' };
    }
  }

  static calcularTempoTrabalhado(batidas) {
    if (!batidas || batidas.length === 0) return 0;

    let totalMinutos = 0;
    let inicioTrabalho = null;

    for (const batida of batidas) {
      const timestamp = new Date(batida.timestamp_servidor);

      if (batida.tipo === 'entrada' || batida.tipo === 'retorno') {
        inicioTrabalho = timestamp;
      } else if ((batida.tipo === 'pausa' || batida.tipo === 'saida') && inicioTrabalho) {
        totalMinutos += (timestamp - inicioTrabalho) / (1000 * 60);
        inicioTrabalho = null;
      }
    }

    if (inicioTrabalho) {
      totalMinutos += (new Date() - inicioTrabalho) / (1000 * 60);
    }

    return totalMinutos;
  }

  static calcularTempoPausa(batidas) {
    if (!batidas || batidas.length === 0) return 0;

    let totalMinutos = 0;
    let inicioPausa = null;

    for (const batida of batidas) {
      const timestamp = new Date(batida.timestamp_servidor);

      if (batida.tipo === 'pausa') {
        inicioPausa = timestamp;
      } else if (batida.tipo === 'retorno' && inicioPausa) {
        totalMinutos += (timestamp - inicioPausa) / (1000 * 60);
        inicioPausa = null;
      }
    }

    if (inicioPausa) {
      totalMinutos += (new Date() - inicioPausa) / (1000 * 60);
    }

    return totalMinutos;
  }

  static async atualizarJornada(userId, superiorEmpresaId, projetoId, empresaId) {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data: batidas } = await this.buscarBatidasDoDia(userId, hoje);

      const totalTrabalhado = this.calcularTempoTrabalhado(batidas);
      const totalPausa = this.calcularTempoPausa(batidas);
      const estadoAtual = this.determinarEstadoJornada(batidas);
      const status = estadoAtual.estado === 'encerrada' ? 'fechada' : 'aberta';

      const { data: profile } = await supabase
        .from('profiles')
        .select('carga_horaria, hora_entrada, hora_saida')
        .eq('id', userId)
        .single();

      const cargaHorariaSemanal = profile?.carga_horaria || 40;
      const jornadaDiariaMinutos = (cargaHorariaSemanal / 5) * 60;

      const horaEntradaPerfil = profile?.hora_entrada
        ? profile.hora_entrada.substring(0, 5)
        : null;
      const horaSaidaPerfil = profile?.hora_saida
        ? profile.hora_saida.substring(0, 5)
        : null;

      const horasExtras = CalculoTrabalhistaService.calcularHorasExtras(Math.floor(totalTrabalhado), jornadaDiariaMinutos);

      let atrasoMinutos = 0;
      let saidaAntecipadaMinutos = 0;
      const LIMITE_ATRASO_RAZOAVEL = jornadaDiariaMinutos;

      if (batidas && batidas.length > 0) {
        const primeiraEntrada = batidas.find(b => b.tipo === 'entrada');
        const ultimaSaida = [...batidas].reverse().find(b => b.tipo === 'saida');

        if (primeiraEntrada && horaEntradaPerfil) {
          const horaReal = new Date(primeiraEntrada.timestamp_servidor)
            .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
          const calculado = CalculoTrabalhistaService.calcularAtraso(horaReal, horaEntradaPerfil);
          atrasoMinutos = calculado <= LIMITE_ATRASO_RAZOAVEL ? calculado : 0;
        }

        if (ultimaSaida && horaSaidaPerfil) {
          const horaReal = new Date(ultimaSaida.timestamp_servidor)
            .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
          const calculado = CalculoTrabalhistaService.calcularSaidaAntecipada(horaReal, horaSaidaPerfil);
          saidaAntecipadaMinutos = calculado <= LIMITE_ATRASO_RAZOAVEL ? calculado : 0;
        }
      }

      const { data: existente } = await supabase
        .from('jornadas')
        .select('id')
        .eq('user_id', userId)
        .eq('data', hoje)
        .maybeSingle();

      const dadosJornada = {
        status,
        total_minutos_trabalhados: Math.floor(totalTrabalhado),
        total_minutos_pausa: Math.floor(totalPausa),
        horas_extras_minutos: Math.floor(horasExtras),
        atraso_minutos: atrasoMinutos,
        saida_antecipada_minutos: saidaAntecipadaMinutos,
        updated_at: new Date().toISOString()
      };

      if (existente) {
        await supabase
          .from('jornadas')
          .update(dadosJornada)
          .eq('id', existente.id);
      } else {
        await supabase
          .from('jornadas')
          .insert([{
            user_id: userId,
            data: hoje,
            ...dadosJornada,
            projeto_id: projetoId || null,
            empresa_id: empresaId || null,
            superior_empresa_id: superiorEmpresaId || null
          }]);
      }
    } catch (error) {
      console.error('Erro ao atualizar jornada:', error);
    }
  }

  static async buscarJornadasPorPeriodo(userId, dataInicio, dataFim) {
    try {
      const { data, error } = await supabase
        .from('jornadas')
        .select('*')
        .eq('user_id', userId)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static async buscarJornadasAdmin(superiorEmpresaId, data = null) {
    try {
      const dataAlvo = data || new Date().toISOString().split('T')[0];

      const { data: jornadas, error } = await supabase
        .from('jornadas')
        .select('*, profiles:user_id(nome, email, cargo, departamento, avatar_url)')
        .eq('superior_empresa_id', superiorEmpresaId)
        .eq('data', dataAlvo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: jornadas || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static formatarMinutos(minutos) {
    if (!minutos || minutos <= 0) return '00:00';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  static formatarMinutosDescritivo(minutos) {
    if (!minutos || minutos <= 0) return '0min';
    const h = Math.floor(minutos / 60);
    const m = Math.floor(minutos % 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m}min`;
  }
}

export default BatidaService;
