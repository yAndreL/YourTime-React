const TOLERANCIA_ATRASO_MINUTOS = 10;
const JORNADA_PADRAO_MINUTOS = 480; // 8h
const PERCENTUAL_EXTRAS_DIA_UTIL = 0.50;   // 50% sobre hora normal
const PERCENTUAL_EXTRAS_DOMINGO_FERIADO = 1.00; // 100%
const LIMITE_2HORAS_EXTRAS_MINUTOS = 120;   // ate 2h = 50%, excede = 100%
const BANCO_HORAS_EXPIRACAO_DIAS = 180;     // saldo expira em 6 meses

// Valores padrao CLT (podem ser sobrescritos via configUsuario)
const DEFAULTS_NOTURNO = {
  percentual: 0.20,       // 20% adicional noturno
  hora_reduzida_minutos: 52.5, // 1h noturna = 52min30s reais
  horario_inicio: 22,
  horario_fim: 5
};

class CalculoTrabalhistaService {
  // ========================
  // Horas extras (minutos brutos)
  // ========================

  static calcularHorasExtras(minutosTrabalhados, jornadaDiariaMinutos = JORNADA_PADRAO_MINUTOS) {
    const excedente = minutosTrabalhados - jornadaDiariaMinutos;
    return excedente > 0 ? excedente : 0;
  }

  /**
   * Calcula o valor percentual das horas extras conforme dia da semana.
   * Dias uteis (seg-sex): 50% sobre hora normal.
   * Domingo: 100% sobre hora normal.
   */
  static obterPercentualExtraParaDia(dataYmd) {
    const date = new Date(dataYmd + 'T00:00:00');
    const diaSemana = date.getDay();
    if (diaSemana === 0) return PERCENTUAL_EXTRAS_DOMINGO_FERIADO;
    return PERCENTUAL_EXTRAS_DIA_UTIL;
  }

  /**
   * Calcula horas extras segmentadas por percentual (50% / 100%).
   * Dias uteis: ate 2h = 50%, excedente = 100%.
   * Domingos/feriados: tudo a 100%.
   */
  static segmentarHorasExtrasPorPercentual(minutosExtras, dataYmd, eFeriado = false) {
    if (minutosExtras <= 0) {
      return { minutos50: 0, minutos100: 0, valor50Minutos: 0, valor100Minutos: 0 };
    }

    let minutos50 = 0;
    let minutos100 = 0;

    const eDiaEspecial = eFeriado || this.obterPercentualExtraParaDia(dataYmd) === PERCENTUAL_EXTRAS_DOMINGO_FERIADO;

    if (eDiaEspecial) {
      minutos100 = minutosExtras;
    } else {
      minutos50 = Math.min(minutosExtras, LIMITE_2HORAS_EXTRAS_MINUTOS);
      minutos100 = Math.max(0, minutosExtras - LIMITE_2HORAS_EXTRAS_MINUTOS);
    }

    const valor50Minutos = Math.round(minutos50 * (1 + PERCENTUAL_EXTRAS_DIA_UTIL));
    const valor100Minutos = Math.round(minutos100 * (1 + PERCENTUAL_EXTRAS_DOMINGO_FERIADO));

    return { minutos50, minutos100, valor50Minutos, valor100Minutos };
  }

  // ========================
  // Adicional Noturno
  // ========================

  /**
   * Resolve configuracoes noturnas (merge com valores CLT padrao).
   * @param {object} configUsuario - pode ter noturno.percentual, noturno.hora_reduzida, noturno.inicio, noturno.fim
   */
  static _resolverConfigNoturno(configUsuario = {}) {
    const n = configUsuario.noturno || {};
    return {
      percentual: n.percentual ?? DEFAULTS_NOTURNO.percentual,
      hora_reduzida_minutos: n.hora_reduzida_minutos ?? DEFAULTS_NOTURNO.hora_reduzida_minutos,
      horario_inicio: n.inicio ?? DEFAULTS_NOTURNO.horario_inicio,
      horario_fim: n.fim ?? DEFAULTS_NOTURNO.horario_fim,
      fuso: configUsuario.fuso_horario || 'America/Sao_Paulo'
    };
  }

  /**
   * Calcula minutos noturnos ficticios conforme regra configurada.
   * Padrao: 60min reais no periodo noturno = ~69min ficticios (CLT 52.5min).
   */
  static calcularAdicionalNoturno(batidas, configUsuario = {}) {
    const cfg = this._resolverConfigNoturno(configUsuario);
    if (!batidas || batidas.length === 0) return 0;

    // minutos reais na faixa noturna
    let minutosReaisNoturnos = 0;
    let inicioTrabalho = null;

    for (const batida of batidas) {
      const timestamp = new Date(batida.timestamp_servidor);
      if (batida.tipo === 'entrada' || batida.tipo === 'retorno') {
        inicioTrabalho = timestamp;
      } else if ((batida.tipo === 'pausa' || batida.tipo === 'saida') && inicioTrabalho) {
        minutosReaisNoturnos += this.calcularMinutosNoPeriodoNoturno(
          inicioTrabalho, timestamp, cfg.fuso, cfg.horario_inicio, cfg.horario_fim
        );
        inicioTrabalho = null;
      }
    }

    // fator: cada minuto noturno real vale 60/hora_reduzida minutos ficticios
    const fator = 60 / cfg.hora_reduzida_minutos;
    return Math.round(minutosReaisNoturnos * fator);
  }

  /**
   * Conta minutos na faixa noturna entre dois instantes, usando fuso.
   */
  static calcularMinutosNoPeriodoNoturno(inicio, fim, fusoIANA = 'America/Sao_Paulo', horarioInicio = 22, horarioFim = 5) {
    const inicioMs = inicio.getTime();
    const fimMs = fim.getTime();
    if (fimMs <= inicioMs) return 0;

    let minutosReaisNoturnos = 0;
    const iter = new Date(inicioMs);

    while (iter.getTime() < fimMs) {
      const horaNoFuso = parseInt(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit', hour12: false, minute: '2-digit',
          timeZone: fusoIANA
        }).format(iter).split(':')[0],
        10
      );
      if (horaNoFuso >= horarioInicio || horaNoFuso < horarioFim) {
        minutosReaisNoturnos++;
      }
      iter.setMinutes(iter.getMinutes() + 1);
    }

    return minutosReaisNoturnos;
  }

  // ========================
  // Intejornada
  // ========================

  static verificarInterjornada(saidaAnterior, entradaAtual) {
    if (!saidaAnterior || !entradaAtual) return { valida: true, horasDescanso: null };

    const saida = new Date(saidaAnterior);
    const entrada = new Date(entradaAtual);
    const diferencaHoras = (entrada - saida) / (1000 * 60 * 60);

    return {
      valida: diferencaHoras >= 11,
      horasDescanso: Math.round(diferencaHoras * 10) / 10,
      minimoNecessario: 11
    };
  }

  // ========================
  // Atraso / Saida Antecipada
  // ========================

  static calcularAtraso(horarioEntradaReal, horarioEntradaEsperado, toleranciaMinutos = TOLERANCIA_ATRASO_MINUTOS) {
    if (!horarioEntradaReal || !horarioEntradaEsperado) return 0;

    const entrada = this.horarioParaMinutos(horarioEntradaReal);
    const esperado = this.horarioParaMinutos(horarioEntradaEsperado);

    const diferenca = entrada - esperado;
    if (diferenca > toleranciaMinutos) {
      return diferenca;
    }
    return 0;
  }

  static calcularSaidaAntecipada(horarioSaidaReal, horarioSaidaEsperado, toleranciaMinutos = TOLERANCIA_ATRASO_MINUTOS) {
    if (!horarioSaidaReal || !horarioSaidaEsperado) return 0;

    const saida = this.horarioParaMinutos(horarioSaidaReal);
    const esperado = this.horarioParaMinutos(horarioSaidaEsperado);

    const diferenca = esperado - saida;
    if (diferenca > toleranciaMinutos) {
      return diferenca;
    }
    return 0;
  }

  // ========================
  // Banco de Horas
  // ========================

  /** Calcula banco de horas simples (sem expiracao). */
  static calcularBancoDeHoras(jornadasDoMes, jornadaDiariaMinutos = JORNADA_PADRAO_MINUTOS) {
    let saldoMinutos = 0;

    for (const jornada of jornadasDoMes) {
      if (jornada.status === 'rejeitada') continue;
      const trabalhado = jornada.total_minutos_trabalhados || 0;
      saldoMinutos += trabalhado - jornadaDiariaMinutos;
    }

    return {
      saldoMinutos,
      saldoFormatado: this.formatarSaldoMinutos(saldoMinutos),
      positivo: saldoMinutos >= 0
    };
  }

  /**
   * Calcula banco de horas com expiracao FIFO.
   * Cada entrada de saldo expira apos BANCO_HORAS_EXPIRACAO_DIAS.
   */
  static calcularBancoDeHorasExpiracao(entradasBanco, dataReferencia = null) {
    const referencia = new Date(dataReferencia || new Date().toISOString());
    const msExpiracao = BANCO_HORAS_EXPIRACAO_DIAS * 24 * 60 * 60 * 1000;

    let saldoValido = 0;
    let saldoExpirado = 0;
    const entradasValidas = [];
    const entradasExpiradas = [];

    const ordenadas = [...(entradasBanco || [])].sort(
      (a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao)
    );

    for (const entrada of ordenadas) {
      const dataCriacao = new Date(entrada.dataCriacao + 'T00:00:00');
      const diffMs = referencia.getTime() - dataCriacao.getTime();
      const expirada = diffMs >= msExpiracao;

      if (expirada) {
        saldoExpirado += entrada.saldoMinutos;
        entradasExpiradas.push({ ...entrada, status: 'expirada' });
      } else {
        saldoValido += entrada.saldoMinutos;
        const diasRestantes = Math.ceil((msExpiracao - diffMs) / (24 * 60 * 60 * 1000));
        entradasValidas.push({ ...entrada, status: 'ativa', diasRestantes });
      }
    }

    return {
      saldoValido,
      saldoExpirado,
      entradasValidas,
      entradasExpiradas,
      saldoValidoFormatado: this.formatarSaldoMinutos(saldoValido),
      saldoExpiradoFormatado: this.formatarSaldoMinutos(saldoExpirado)
    };
  }

  // ========================
  // Fechamento Mensal (resumo completo)
  // ========================

  /**
   * Resumo para fechamento de ponto do mes.
   * Inclui: horas totais, extras (50%/100%), adicional noturno,
   * atrasos, faltas, banco de horas, valor estimado em R$.
   */
  static calcularFechamentoMensal(jornadas, batidasPorDia, configUsuario = {}) {
    const jornadaDiariaMinutos = (configUsuario.carga_horaria || 8) * 60;
    const feriados = configUsuario.feriados || [];
    const salarioBase = configUsuario.salarioBase || 0;

    let totalTrabalhadoMinutos = 0;
    let totalExtrasMinutos = 0;
    let totalExtras50Minutos = 0;
    let totalExtras100Minutos = 0;
    let totalNoturnasMinutosFicticios = 0;
    let totalAtrasoMinutos = 0;
    let diasTrabalhados = 0;
    let diasFalta = 0;
    let diasComAtraso = 0;

    const detalheDiario = [];

    for (const jornada of jornadas) {
      if (jornada.status === 'rejeitada') continue;

      const dia = jornada.data;
      const isFeriado = feriados.includes(dia);
      const batidasDoDia = batidasPorDia?.[dia] || [];

      const trabalhado = jornada.total_minutos_trabalhados || 0;
      const extras = this.calcularHorasExtras(trabalhado, jornadaDiariaMinutos);
      const segmentacao = this.segmentarHorasExtrasPorPercentual(extras, dia, isFeriado);

      const noturnasFicticios = batidasDoDia.length > 0
        ? this.calcularAdicionalNoturno(batidasDoDia,
            configUsuario.fuso_horario)
        : 0;

      if (trabalhado > 0) {
        diasTrabalhados++;
        totalTrabalhadoMinutos += trabalhado;
        totalExtrasMinutos += extras;
        totalExtras50Minutos += segmentacao.minutos50;
        totalExtras100Minutos += segmentacao.minutos100;
        totalNoturnasMinutosFicticios += noturnasFicticios;

        if (jornada.atraso_minutos > 0) {
          totalAtrasoMinutos += jornada.atraso_minutos;
          diasComAtraso++;
        }
      } else if (jornada.status !== 'aberta') {
        diasFalta++;
      }

      detalheDiario.push({
        data: dia,
        trabalhado,
        extras,
        segmentacao,
        noturnasFicticios,
        atrasoMinutos: jornada.atraso_minutos || 0,
        status: jornada.status
      });
    }

    const bancoHoras = this.calcularBancoDeHoras(jornadas, jornadaDiariaMinutos);

    const valorEmReais = salarioBase > 0
      ? this.calcularValorHorasExtrasEmReis(salarioBase, totalExtras50Minutos, totalExtras100Minutos)
      : null;

    return {
      totalTrabalhadoMinutos,
      totalTrabalhadoFormatado: this.formatarMinutos(totalTrabalhadoMinutos),
      totalExtrasMinutos,
      totalExtrasFormatado: this.formatarMinutos(totalExtrasMinutos),
      totalExtras50Minutos,
      totalExtras50Formatado: this.formatarMinutos(totalExtras50Minutos),
      totalExtras100Minutos,
      totalExtras100Formatado: this.formatarMinutos(totalExtras100Minutos),
      totalNoturnasMinutosFicticios,
      totalNoturnasFormatado: this.formatarMinutos(totalNoturnasMinutosFicticios),
      totalAtrasoMinutos,
      totalAtrasoFormatado: this.formatarMinutos(totalAtrasoMinutos),
      diasTrabalhados,
      diasFalta,
      diasComAtraso,
      diasUteis: configUsuario.dias_uteis || 22,
      bancoHoras,
      mediaDiariaMinutos: diasTrabalhados > 0 ? Math.round(totalTrabalhadoMinutos / diasTrabalhados) : 0,
      valorEmReais,
      detalheDiario
    };
  }

  /** Compatibilidade com versoes anteriores. */
  static calcularResumoMensal(jornadas, configUsuario = {}) {
    return this.calcularFechamentoMensal(jornadas, null, configUsuario);
  }

  /**
   * Calcula valor estimado das horas extras em R$.
   * Valor-hora = salario / 220 (base CLT, 44h semanais).
   */
  static calcularValorHorasExtrasEmReis(salarioBase, minutos50, minutos100) {
    const valorHora = salarioBase / 220;
    const horas50 = minutos50 / 60;
    const horas100 = minutos100 / 60;

    return {
      valorHora,
      valor50: horas50 * valorHora * 1.5,
      valor100: horas100 * valorHora * 2.0,
      valorTotal: (horas50 * valorHora * 1.5) + (horas100 * valorHora * 2.0)
    };
  }

  // ========================
  // Analise de Jornada (por dia)
  // ========================

  static analisarJornada(jornada, batidas, configUsuario = {}) {
    const jornadaDiariaMinutos = (configUsuario.carga_horaria || 8) * 60;
    const horaEntrada = configUsuario.hora_entrada_padrao || '09:00';
    const horaSaida = configUsuario.hora_saida_padrao || '18:00';
    const tolerancia = configUsuario.tolerancia_minutos || TOLERANCIA_ATRASO_MINUTOS;

    const trabalhado = jornada?.total_minutos_trabalhados || 0;
    const horasExtras = this.calcularHorasExtras(trabalhado, jornadaDiariaMinutos);

    const dataDia = jornada?.data || null;
    const eFeriado = dataDia ? (configUsuario.feriados || []).includes(dataDia) : false;
    const segmentacao = this.segmentarHorasExtrasPorPercentual(horasExtras, dataDia || '2000-01-01', eFeriado);

    const fuso = configUsuario.fuso_horario || 'America/Sao_Paulo';
    const noturnasFicticios = batidas?.length > 0
      ? this.calcularAdicionalNoturno(batidas, fuso)
      : 0;

    let atrasoMinutos = 0;
    let saidaAntecipadaMinutos = 0;

    if (batidas && batidas.length > 0) {
      const primeiraEntrada = batidas.find(b => b.tipo === 'entrada');
      const ultimaSaida = [...batidas].reverse().find(b => b.tipo === 'saida');

      if (primeiraEntrada) {
        const horaEntradaReal = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: fuso
        }).format(new Date(primeiraEntrada.timestamp_servidor));
        atrasoMinutos = this.calcularAtraso(horaEntradaReal, horaEntrada, tolerancia);
      }

      if (ultimaSaida) {
        const horaSaidaReal = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: fuso
        }).format(new Date(ultimaSaida.timestamp_servidor));
        saidaAntecipadaMinutos = this.calcularSaidaAntecipada(horaSaidaReal, horaSaida, tolerancia);
      }
    }

    const irregularidades = [];
    if (atrasoMinutos > 0) {
      irregularidades.push({ tipo: 'atraso', minutos: atrasoMinutos });
    }
    if (saidaAntecipadaMinutos > 0) {
      irregularidades.push({ tipo: 'saida_antecipada', minutos: saidaAntecipadaMinutos });
    }
    if (horasExtras > 0) {
      irregularidades.push({
        tipo: 'hora_extra',
        minutos: horasExtras,
        minuto50: segmentacao.minutos50,
        minuto100: segmentacao.minutos100
      });
    }
    if (noturnasFicticios > 0) {
      irregularidades.push({ tipo: 'adicional_noturno', minutosFicticios: noturnasFicticios });
    }

    return {
      trabalhado,
      trabalhadoFormatado: this.formatarMinutos(trabalhado),
      horasExtras,
      horasExtrasFormatado: this.formatarMinutos(horasExtras),
      segmentacao,
      noturnasFicticios,
      atrasoMinutos,
      saidaAntecipadaMinutos,
      irregularidades,
      deficit: Math.max(0, jornadaDiariaMinutos - trabalhado),
      excedente: Math.max(0, trabalhado - jornadaDiariaMinutos)
    };
  }

  // -- utilitarios --

  static horarioParaMinutos(horario) {
    if (!horario) return 0;
    const partes = horario.split(':');
    return parseInt(partes[0]) * 60 + parseInt(partes[1]);
  }

  static formatarMinutos(minutos) {
    if (!minutos || minutos <= 0) return '00:00';
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  static formatarSaldoMinutos(minutos) {
    const sinal = minutos >= 0 ? '+' : '-';
    const abs = Math.abs(minutos);
    const h = Math.floor(abs / 60);
    const m = Math.round(abs % 60);
    return `${sinal}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}

export default CalculoTrabalhistaService;
