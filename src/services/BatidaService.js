import { supabase } from '../config/supabase';
import CalculoTrabalhistaService from './CalculoTrabalhistaService';
import ConfigService from './ConfigService';
import { postRegistrarBatida } from './ApiService';
import { BATIDA_PROJETO } from '../constants/AppConstants';
import {
  FUSO_PADRAO_IANA,
  obterDataCalendarioIsoNoFuso,
  obterDataCalendarioIsoDoTimestampUtc,
  obterDiaAnteriorCalendarioYmd,
  obterProximoDiaCalendarioYmd,
  obterIntervaloUtcSemiabertoParaDiaCalendario,
  obterIntervaloUtcSemiabertoParaPeriodoCalendario
} from '../utils/fusoHorarioData';

class BatidaService {
  /** Calcula distância entre dois pontos em metros (fórmula de Haversine) */
  static distanciaHaversine(lat1, lon1, lat2, lon2) {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number') return Infinity;
    const R = 6371000;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Busca configuração de geocerca de um projeto */
  static async buscarGeocercaProjeto(projetoId) {
    if (!projetoId) return null;
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('geocerca_latitude, geocerca_longitude, geocerca_raio_metros')
        .eq('id', projetoId)
        .maybeSingle();
      if (error || !data || data.geocerca_latitude == null) return null;
      return {
        latitude: data.geocerca_latitude,
        longitude: data.geocerca_longitude,
        raio_metros: data.geocerca_raio_metros || 100
      };
    } catch {
      return null;
    }
  }

  static async resolverFusoHorarioUsuario(userId) {
    if (!userId) return FUSO_PADRAO_IANA;
    const resultado = await ConfigService.buscarConfiguracoes(userId);
    if (resultado.success && resultado.data?.fuso_horario) {
      return resultado.data.fuso_horario;
    }
    return FUSO_PADRAO_IANA;
  }
  static async registrarBatida({ tipo, latitude, longitude, precisaoGps, projetoId, observacao }) {
    try {
      const resultado = await postRegistrarBatida({
        tipo,
        projetoId,
        latitude,
        longitude,
        precisaoGps,
        observacao
      });
      return { success: true, data: resultado.batida, estado: resultado.estado };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async buscarBatidasDoDia(userId, data = null, fusoHorario = null) {
    try {
      const fuso = fusoHorario ?? (await this.resolverFusoHorarioUsuario(userId));
      const dataAlvo = data ?? obterDataCalendarioIsoNoFuso(new Date(), fuso);
      const { inicioUtcIso, exclusivoFimUtcIso } = obterIntervaloUtcSemiabertoParaDiaCalendario(dataAlvo, fuso);

      const { data: batidas, error } = await supabase
        .from('batidas')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp_servidor', inicioUtcIso)
        .lt('timestamp_servidor', exclusivoFimUtcIso)
        .order('timestamp_servidor', { ascending: true });

      if (error) throw error;
      return { success: true, data: batidas || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Busca batidas em intervalo de dias civis (inclusive) no fuso, com ordenação cronológica.
   */
  static async buscarBatidasPorPeriodoCalendario(userId, dataInicioYmd, dataFimYmd, fusoHorario = null) {
    try {
      const fuso = fusoHorario ?? (await this.resolverFusoHorarioUsuario(userId));
      const { inicioUtcIso, exclusivoFimUtcIso } = obterIntervaloUtcSemiabertoParaPeriodoCalendario(
        dataInicioYmd,
        dataFimYmd,
        fuso
      );
      const { data: batidas, error } = await supabase
        .from('batidas')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp_servidor', inicioUtcIso)
        .lt('timestamp_servidor', exclusivoFimUtcIso)
        .order('timestamp_servidor', { ascending: true });
      if (error) throw error;
      return { success: true, data: batidas || [], fuso };
    } catch (error) {
      return { success: false, error: error.message, data: [], fuso: fusoHorario ?? FUSO_PADRAO_IANA };
    }
  }

  /**
   * Janela de três dias civis centrada no dia da batida (dia−1 … dia+1) para não cortar segmento noturno.
   */
  static async buscarBatidasJanelaMargemParaSegmentacao(userId, timestampIsoUtc, fusoHorario = null) {
    const fusoResolvido = fusoHorario ?? (await this.resolverFusoHorarioUsuario(userId));
    const dataCentro = obterDataCalendarioIsoDoTimestampUtc(timestampIsoUtc, fusoResolvido);
    if (!dataCentro) {
      return { success: false, error: 'Timestamp inválido.', data: [], fuso: fusoResolvido };
    }
    const dataInicio = obterDiaAnteriorCalendarioYmd(dataCentro);
    const dataFim = obterProximoDiaCalendarioYmd(dataCentro);
    return this.buscarBatidasPorPeriodoCalendario(userId, dataInicio, dataFim, fusoResolvido);
  }

  /**
   * Janela ±2 dias civis em torno do dia da referência (5 dias no total) para consolidar jornada sem perder segmento longo.
   */
  static async buscarBatidasJanelaExpandidaParaAtualizacaoJornada(userId, timestampIsoUtc, fusoHorario = null) {
    const fusoResolvido = fusoHorario ?? (await this.resolverFusoHorarioUsuario(userId));
    const centro = obterDataCalendarioIsoDoTimestampUtc(timestampIsoUtc, fusoResolvido);
    if (!centro) {
      return { success: false, error: 'Timestamp inválido.', data: [], fuso: fusoResolvido };
    }
    const dataInicio = obterDiaAnteriorCalendarioYmd(obterDiaAnteriorCalendarioYmd(centro));
    const dataFim = obterProximoDiaCalendarioYmd(obterProximoDiaCalendarioYmd(centro));
    return this.buscarBatidasPorPeriodoCalendario(userId, dataInicio, dataFim, fusoResolvido);
  }

  static async buscarJornadaDoDia(userId, data = null, fusoHorario = null) {
    try {
      const fuso = fusoHorario ?? (await this.resolverFusoHorarioUsuario(userId));
      const dataAlvo = data ?? obterDataCalendarioIsoNoFuso(new Date(), fuso);

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

  /** Texto tipo "3h6min" para colunas do painel admin (mesmo estilo de apontamento por períodos). */
  static formatarDescritivoHorasTrabalhadasDasBatidas(batidasLista) {
    const min = Math.floor(this.calcularTempoTrabalhado(batidasLista || []));
    return this.formatarMinutosDescritivo(min);
  }

  /** Formato HH:MM usado no resumo numérico do histórico de apontamentos. */
  static formatarHorasMinutosDecimalStringAPartirDasBatidas(batidasLista) {
    const min = Math.floor(this.calcularTempoTrabalhado(batidasLista || []));
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Mapeia batidas ordenadas para os quatro horários do formulário de apontamento (1ª e 2ª entrada/saída).
   * @param {Array} batidasLista - batidas ordenadas
   * @param {string} fusoIANA - fuso IANA para exibição dos horários (padrão 'America/Sao_Paulo')
   */
  static formatarHorariosQuatroSlotsEstiloApontamento(batidasLista, fusoIANA = FUSO_PADRAO_IANA) {
    const ordenadas = [...(batidasLista || [])].sort(
      (a, c) => new Date(a.timestamp_servidor) - new Date(c.timestamp_servidor)
    );
    const entradas = ordenadas.filter(b => b.tipo === 'entrada');
    const saidas = ordenadas.filter(b => b.tipo === 'saida');
    const formatarHoraNoFuso = b =>
      b?.timestamp_servidor
        ? new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: fusoIANA
          }).format(new Date(b.timestamp_servidor))
        : '--:--';
    return {
      entrada1: formatarHoraNoFuso(entradas[0]),
      saida1: formatarHoraNoFuso(saidas[0]),
      entrada2: formatarHoraNoFuso(entradas[1]),
      saida2: formatarHoraNoFuso(saidas[1])
    };
  }

  static async atualizarJornada(userId, superiorEmpresaId, projetoId, empresaId) {
    try {
      const fuso = await this.resolverFusoHorarioUsuario(userId);
      const agoraIso = new Date().toISOString();

      const { success: okBatidas, data: batidasJanela } =
        await this.buscarBatidasJanelaExpandidaParaAtualizacaoJornada(userId, agoraIso, fuso);
      if (!okBatidas || !batidasJanela?.length) {
        return;
      }

      const batidasOrdenadas = [...batidasJanela].sort(
        (a, c) => new Date(a.timestamp_servidor) - new Date(c.timestamp_servidor)
      );
      const ultimaBatida = batidasOrdenadas[batidasOrdenadas.length - 1];
      if (!ultimaBatida?.id) {
        return;
      }

      const segmentoDaUltimaBatida = this.obterSegmentoQueContemBatida(batidasOrdenadas, ultimaBatida.id);
      if (!segmentoDaUltimaBatida?.length) {
        return;
      }

      const diaOficialUltimaBatida = this.obterDiaJornadaIsoDoSegmento(segmentoDaUltimaBatida, fuso);
      if (!diaOficialUltimaBatida) {
        return;
      }

      const batidasPorDiaOficial = this.agruparBatidasPorDiaOficialJornada(batidasOrdenadas, fuso);
      const chavesOficiais = Object.keys(batidasPorDiaOficial).sort();

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

      const LIMITE_ATRASO_RAZOAVEL = jornadaDiariaMinutos;

      for (const diaJornadaAlvo of chavesOficiais) {
        const batidasDoDiaOficial = batidasPorDiaOficial[diaJornadaAlvo];
        if (!batidasDoDiaOficial?.length) continue;

        const totalTrabalhado = this.calcularTempoTrabalhado(batidasDoDiaOficial);
        const totalPausa = this.calcularTempoPausa(batidasDoDiaOficial);
        const estadoAtual = this.determinarEstadoJornada(batidasDoDiaOficial);
        const status = estadoAtual.estado === 'encerrada' ? 'fechada' : 'aberta';

        const horasExtras = CalculoTrabalhistaService.calcularHorasExtras(
          Math.floor(totalTrabalhado),
          jornadaDiariaMinutos
        );

        let atrasoMinutos = 0;
        let saidaAntecipadaMinutos = 0;

        const primeiraEntrada = batidasDoDiaOficial.find(b => b.tipo === 'entrada');
        const ultimaSaida = [...batidasDoDiaOficial].reverse().find(b => b.tipo === 'saida');

        if (primeiraEntrada && horaEntradaPerfil) {
          const horaReal = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: fuso
          }).format(new Date(primeiraEntrada.timestamp_servidor));
          const calculado = CalculoTrabalhistaService.calcularAtraso(horaReal, horaEntradaPerfil);
          atrasoMinutos = calculado <= LIMITE_ATRASO_RAZOAVEL ? calculado : 0;
        }

        if (ultimaSaida && horaSaidaPerfil) {
          const horaReal = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: fuso
          }).format(new Date(ultimaSaida.timestamp_servidor));
          const calculado = CalculoTrabalhistaService.calcularSaidaAntecipada(horaReal, horaSaidaPerfil);
          saidaAntecipadaMinutos = calculado <= LIMITE_ATRASO_RAZOAVEL ? calculado : 0;
        }

        const { data: existente } = await supabase
          .from('jornadas')
          .select('id')
          .eq('user_id', userId)
          .eq('data', diaJornadaAlvo)
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
          const ehDiaDaUltimaBatida = diaJornadaAlvo === diaOficialUltimaBatida;
          await supabase
            .from('jornadas')
            .insert([{
              user_id: userId,
              data: diaJornadaAlvo,
              ...dadosJornada,
              projeto_id: ehDiaDaUltimaBatida ? (projetoId || null) : null,
              empresa_id: ehDiaDaUltimaBatida ? (empresaId || null) : null,
              superior_empresa_id: ehDiaDaUltimaBatida ? (superiorEmpresaId || null) : null
            }]);
        }
      }

      const diaCivilUltimaBatida = obterDataCalendarioIsoDoTimestampUtc(ultimaBatida.timestamp_servidor, fuso);
      const existeBlocoOficialComChaveIgualAoDiaCivilDaUltimaBatida = Boolean(
        diaCivilUltimaBatida && batidasPorDiaOficial[diaCivilUltimaBatida]?.length
      );
      if (
        ultimaBatida.tipo === 'saida' &&
        diaCivilUltimaBatida &&
        diaCivilUltimaBatida !== diaOficialUltimaBatida &&
        !existeBlocoOficialComChaveIgualAoDiaCivilDaUltimaBatida
      ) {
        await supabase
          .from('jornadas')
          .delete()
          .eq('user_id', userId)
          .eq('data', diaCivilUltimaBatida);
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

  static async buscarJornadasAdmin(superiorEmpresaId, data = null, fusoHorario = null) {
    try {
      const fuso = fusoHorario ?? FUSO_PADRAO_IANA;
      const dataAlvo = data ?? obterDataCalendarioIsoNoFuso(new Date(), fuso);

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

  static obterIntervaloMesCorrenteFormatado(fusoIANA = FUSO_PADRAO_IANA) {
    const agoraNoFuso = new Intl.DateTimeFormat('en-CA', {
      timeZone: fusoIANA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    const [anoStr, mesStr] = agoraNoFuso.split('-');
    const ano = parseInt(anoStr);
    const mes = parseInt(mesStr);
    const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    return {
      dataInicio: `${ano}-${mesStr}-01`,
      dataFim: `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`
    };
  }

  static obterIntervaloDoMesFormatado(ano, mesUmDoze) {
    const ultimoDia = new Date(ano, mesUmDoze, 0).getDate();
    const mm = String(mesUmDoze).padStart(2, '0');
    return {
      dataInicio: `${ano}-${mm}-01`,
      dataFim: `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}`
    };
  }

  /**
   * Todas as batidas do usuário (sequência completa) para segmentar jornada e calcular horas por projeto.
   */
  static async listarBatidasOrdenadasDoUsuarioParaCalculoProjetos(userId) {
    try {
      const { data, error } = await supabase
        .from('batidas')
        .select('projeto_id, tipo, timestamp_servidor')
        .eq('user_id', userId)
        .order('timestamp_servidor', { ascending: true });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * @deprecated Prefira listarBatidasOrdenadasDoUsuarioParaCalculoProjetos — lista só com projeto quebra segmentação.
   */
  static async listarBatidasComProjetoDoUsuario(userId) {
    return this.listarBatidasOrdenadasDoUsuarioParaCalculoProjetos(userId);
  }

  /**
   * Soma horas trabalhadas por projeto: segmenta a lista completa, define o dia oficial pela primeira batida de cada segmento
   * e aplica calcularTempoTrabalhado no bloco (jornada que atravessa meia-noite não é dividida por dia civil).
   * Vários projetos no mesmo segmento (raro): horas do bloco rateadas igualmente entre os projetos presentes.
   * @returns {Record<string, number>} mapa projeto_id → horas decimais
   */
  static calcularHorasTrabalhadasPorProjetoAPartirDasBatidas(batidasLinhas, fusoHorario = FUSO_PADRAO_IANA) {
    const mapa = {};
    if (!batidasLinhas?.length) return mapa;
    const ordenadas = [...batidasLinhas].sort(
      (a, c) => new Date(a.timestamp_servidor) - new Date(c.timestamp_servidor)
    );
    const segmentos = this.obterSegmentosJornadaDoDia(ordenadas);
    for (const segmento of segmentos) {
      const diaJornada = obterDataCalendarioIsoDoTimestampUtc(segmento[0]?.timestamp_servidor, fusoHorario);
      if (!diaJornada) continue;

      const projetoIdsNoSegmento = [
        ...new Set(
          segmento
            .filter(b => b.projeto_id != null && b.projeto_id !== '')
            .map(b => String(b.projeto_id))
        )
      ];
      if (projetoIdsNoSegmento.length === 0) continue;

      const minutosSegmento = this.calcularTempoTrabalhado(segmento);

      if (projetoIdsNoSegmento.length === 1) {
        const pid = projetoIdsNoSegmento[0];
        mapa[pid] = (mapa[pid] || 0) + minutosSegmento / 60;
        continue;
      }

      const horasParcela = minutosSegmento / 60 / projetoIdsNoSegmento.length;
      for (const pid of projetoIdsNoSegmento) {
        mapa[pid] = (mapa[pid] || 0) + horasParcela;
      }
    }
    return mapa;
  }

  static async contarBatidasSemProjetoNoPeriodo(idsUsuario, dataInicio, dataFim, fusoHorario = FUSO_PADRAO_IANA) {
    try {
      if (!idsUsuario || idsUsuario.length === 0) {
        return { success: true, count: 0 };
      }
      const { inicioUtcIso, exclusivoFimUtcIso } = obterIntervaloUtcSemiabertoParaPeriodoCalendario(
        dataInicio,
        dataFim,
        fusoHorario
      );
      let consulta = supabase
        .from('batidas')
        .select('*', { count: 'exact', head: true })
        .is('projeto_id', null)
        .gte('timestamp_servidor', inicioUtcIso)
        .lt('timestamp_servidor', exclusivoFimUtcIso);
      if (idsUsuario.length === 1) {
        consulta = consulta.eq('user_id', idsUsuario[0]);
      } else {
        consulta = consulta.in('user_id', idsUsuario);
      }
      const { count, error } = await consulta;
      if (error) throw error;
      return { success: true, count: count ?? 0 };
    } catch (error) {
      return { success: false, error: error.message, count: 0 };
    }
  }

  static async verificarBatidasSemProjetoAntesExportacao(idsUsuario, dataInicio, dataFim, fusoHorario = FUSO_PADRAO_IANA) {
    const resultadoContagem = await this.contarBatidasSemProjetoNoPeriodo(
      idsUsuario,
      dataInicio,
      dataFim,
      fusoHorario
    );
    const quantidade = resultadoContagem.success ? resultadoContagem.count : 0;
    const possuiPendencias = quantidade > 0;
    const deveBloquear = BATIDA_PROJETO.BLOQUEAR_EXPORT_SE_BATIDAS_SEM_PROJETO && possuiPendencias;
    return {
      ...resultadoContagem,
      quantidadePendencias: quantidade,
      possuiPendencias,
      deveBloquear
    };
  }

  static async listarBatidasSemProjetoDoUsuario(userId, dataInicio, dataFim, fusoHorario = FUSO_PADRAO_IANA) {
    try {
      const { inicioUtcIso, exclusivoFimUtcIso } = obterIntervaloUtcSemiabertoParaPeriodoCalendario(
        dataInicio,
        dataFim,
        fusoHorario
      );
      const { data, error } = await supabase
        .from('batidas')
        .select('id, user_id, tipo, timestamp_servidor, projeto_id, empresa_id')
        .eq('user_id', userId)
        .is('projeto_id', null)
        .gte('timestamp_servidor', inicioUtcIso)
        .lt('timestamp_servidor', exclusivoFimUtcIso)
        .order('timestamp_servidor', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  static verificarSeBatidaPermiteAssociarProjeto(batida, limiteDias = BATIDA_PROJETO.DIAS_MAX_ASSOCIACAO_RETROATIVA) {
    if (!batida?.timestamp_servidor) return false;
    if (batida.projeto_id != null && batida.projeto_id !== '') return false;
    const instanteBatida = new Date(batida.timestamp_servidor).getTime();
    const limiteMs = limiteDias * 24 * 60 * 60 * 1000;
    return instanteBatida >= Date.now() - limiteMs;
  }

  /**
   * Agrupa batidas pelo dia oficial da jornada (primeira batida de cada segmento entrada → … → saída).
   * Use lista cronológica completa (ex.: após buscar com margem), não recortar por dia civil antes de segmentar.
   * @returns {Record<string, Array>} chave YYYY-MM-DD → batidas daquele dia de jornada
   */
  static agruparBatidasPorDiaOficialJornada(batidasOrdenadas, fusoHorario = FUSO_PADRAO_IANA) {
    const porDia = {};
    const ordenadas = [...(batidasOrdenadas || [])].sort(
      (a, c) => new Date(a.timestamp_servidor) - new Date(c.timestamp_servidor)
    );
    const segmentos = this.obterSegmentosJornadaDoDia(ordenadas);
    for (const segmento of segmentos) {
      const diaJornada = obterDataCalendarioIsoDoTimestampUtc(segmento[0]?.timestamp_servidor, fusoHorario);
      if (!diaJornada) continue;
      if (!porDia[diaJornada]) porDia[diaJornada] = [];
      for (const b of segmento) porDia[diaJornada].push(b);
    }
    for (const chave of Object.keys(porDia)) {
      porDia[chave].sort((a, c) => new Date(a.timestamp_servidor) - new Date(c.timestamp_servidor));
    }
    return porDia;
  }

  /**
   * Dia civil (YYYY-MM-DD) em que a jornada do segmento se apresenta: o da primeira batida do bloco.
   */
  static obterDiaJornadaIsoDoSegmento(segmentoBatidas, fusoHorario = FUSO_PADRAO_IANA) {
    if (!segmentoBatidas?.length) return '';
    return obterDataCalendarioIsoDoTimestampUtc(segmentoBatidas[0].timestamp_servidor, fusoHorario);
  }

  /**
   * Segmenta a lista de batidas em ordem cronológica em blocos entrada → … → saída (e segmento aberto sem saída).
   * Nome histórico "DoDia": a lista deve ser a janela completa necessária (p.ex. com margem), não só um dia civil.
   * Garante que associação de projeto aplique ao mesmo bloco (não misturar entrada A com saída B).
   */
  static obterSegmentosJornadaDoDia(batidasOrdenadas) {
    const segmentos = [];
    let corrente = [];
    for (const b of batidasOrdenadas) {
      if (b.tipo === 'entrada') {
        if (corrente.length) segmentos.push(corrente);
        corrente = [b];
      } else if (corrente.length > 0) {
        corrente.push(b);
        if (b.tipo === 'saida') {
          segmentos.push(corrente);
          corrente = [];
        }
      } else {
        corrente = [b];
      }
    }
    if (corrente.length) segmentos.push(corrente);
    return segmentos;
  }

  static obterSegmentoQueContemBatida(batidasOrdenadas, batidaId) {
    const segmentos = this.obterSegmentosJornadaDoDia(batidasOrdenadas);
    return segmentos.find(seg => seg.some(b => b.id === batidaId)) || null;
  }

  /** Bloco sem registro de saída (jornada ainda aberta naquele segmento). */
  static verificarSeSegmentoJornadaEstaAberto(segmento) {
    if (!segmento?.length) return false;
    return !segmento.some(b => b.tipo === 'saida');
  }

  /**
   * Preview para o modal de associação (janela com margem + segmentação global).
   * @returns {Promise<{ success: true, quantidadeBatidasNoSegmento: number, quantidadeElegivel: number, abertoSemSaida: boolean, dataMinIso: string, dataMaxIso: string } | { success: false, error: string }>}
   */
  static async obterPreviewSegmentoParaAssociacao(userId, batidaId) {
    try {
      const { data: batida, error: erroBatida } = await supabase
        .from('batidas')
        .select('id, timestamp_servidor, user_id')
        .eq('id', batidaId)
        .single();

      if (erroBatida || !batida) {
        return { success: false, error: 'Batida não encontrada.' };
      }
      if (batida.user_id !== userId) {
        return { success: false, error: 'Batida inválida.' };
      }

      const fuso = await this.resolverFusoHorarioUsuario(userId);
      const { success: okJanela, data: batidasJanela, error: erroJanela } =
        await this.buscarBatidasJanelaMargemParaSegmentacao(userId, batida.timestamp_servidor, fuso);
      if (!okJanela || erroJanela) {
        return { success: false, error: erroJanela || 'Não foi possível carregar batidas para o segmento.' };
      }
      if (!batidasJanela?.length) {
        return { success: false, error: 'Não foi possível carregar as batidas do período.' };
      }

      const segmento = this.obterSegmentoQueContemBatida(batidasJanela, batidaId);
      if (!segmento?.length) {
        return { success: false, error: 'Segmento de jornada não encontrado.' };
      }

      const elegiveis = segmento.filter(
        b =>
          (b.projeto_id == null || b.projeto_id === '') && this.verificarSeBatidaPermiteAssociarProjeto(b)
      );
      const timestamps = segmento.map(b => b.timestamp_servidor).filter(Boolean).sort();
      const dataMinIso = timestamps[0] || '';
      const dataMaxIso = timestamps[timestamps.length - 1] || '';

      return {
        success: true,
        quantidadeBatidasNoSegmento: segmento.length,
        quantidadeElegivel: elegiveis.length,
        abertoSemSaida: this.verificarSeSegmentoJornadaEstaAberto(segmento),
        dataMinIso,
        dataMaxIso
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async associarProjetoNaBatidaDoProprioUsuario(batidaId, userId, projetoId) {
    try {
      const { data: batida, error: erroBatida } = await supabase
        .from('batidas')
        .select('*')
        .eq('id', batidaId)
        .single();

      if (erroBatida || !batida) {
        return { success: false, error: 'Batida não encontrada.' };
      }
      if (batida.user_id !== userId) {
        return { success: false, error: 'Você só pode alterar suas próprias batidas.' };
      }
      if (batida.projeto_id != null && batida.projeto_id !== '') {
        return { success: false, error: 'Esta batida já possui projeto.' };
      }
      if (!this.verificarSeBatidaPermiteAssociarProjeto(batida)) {
        return {
          success: false,
          error: `Não é possível associar projeto após ${BATIDA_PROJETO.DIAS_MAX_ASSOCIACAO_RETROATIVA} dias da batida.`
        };
      }

      const { data: projeto, error: erroProjeto } = await supabase
        .from('projetos')
        .select('id, empresa_id')
        .eq('id', projetoId)
        .eq('status', 'ativo')
        .maybeSingle();

      if (erroProjeto || !projeto) {
        return { success: false, error: 'Projeto inválido ou inativo.' };
      }

      const fuso = await this.resolverFusoHorarioUsuario(userId);
      const { success: okJanela, data: batidasJanela, error: erroJanela } =
        await this.buscarBatidasJanelaMargemParaSegmentacao(userId, batida.timestamp_servidor, fuso);
      if (!okJanela || erroJanela) {
        return { success: false, error: erroJanela || 'Não foi possível carregar batidas para o segmento.' };
      }
      if (!batidasJanela?.length) {
        return { success: false, error: 'Não foi possível carregar as batidas do período.' };
      }

      const segmento = this.obterSegmentoQueContemBatida(batidasJanela, batidaId);
      if (!segmento?.length) {
        return { success: false, error: 'Segmento de jornada não encontrado.' };
      }

      const idsParaAssociar = [];
      for (const b of segmento) {
        if (b.projeto_id != null && b.projeto_id !== '') continue;
        if (!this.verificarSeBatidaPermiteAssociarProjeto(b)) continue;
        idsParaAssociar.push(b.id);
      }

      if (idsParaAssociar.length === 0) {
        return { success: false, error: 'Nenhuma batida elegível no mesmo período de entrada/saída.' };
      }

      const { data: atualizadas, error: erroAtualizacao } = await supabase
        .from('batidas')
        .update({
          projeto_id: projetoId,
          empresa_id: projeto.empresa_id ?? null
        })
        .in('id', idsParaAssociar)
        .eq('user_id', userId)
        .is('projeto_id', null)
        .select('id');

      if (erroAtualizacao) throw erroAtualizacao;

      const quantidadeRecebida = atualizadas?.length ?? 0;
      const quantidadeEsperada = idsParaAssociar.length;

      if (quantidadeRecebida === 0) {
        return {
          success: false,
          error: 'Esta batida já possui projeto ou foi alterada por outra operação.'
        };
      }

      if (quantidadeRecebida < quantidadeEsperada) {
        return {
          success: false,
          conflitoParcial: true,
          quantidadeAssociadas: quantidadeRecebida,
          quantidadeEsperada,
          error: 'CONFLITO_PARCIAL_ASSOCIACAO'
        };
      }

      return { success: true, quantidadeAssociadas: quantidadeRecebida };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default BatidaService;
