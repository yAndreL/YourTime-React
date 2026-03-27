const TOLERANCIA_ATRASO_MINUTOS = 10;
const JORNADA_PADRAO_MINUTOS = 480; // 8h
const JORNADA_SEMANAL_PADRAO_MINUTOS = 2640; // 44h
const INTERJORNADA_MINIMA_HORAS = 11;
const HORARIO_NOTURNO_INICIO = 22;
const HORARIO_NOTURNO_FIM = 5;
const HORA_NOTURNA_FATOR = 52.5 / 60;

class CalculoTrabalhistaService {
  static calcularHorasExtras(minutosTrabalhados, jornadaDiariaMinutos = JORNADA_PADRAO_MINUTOS) {
    const excedente = minutosTrabalhados - jornadaDiariaMinutos;
    return excedente > 0 ? excedente : 0;
  }

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

  static calcularAdicionalNoturno(batidas) {
    if (!batidas || batidas.length === 0) return 0;

    let minutosNoturnos = 0;
    let inicioTrabalho = null;

    for (const batida of batidas) {
      const timestamp = new Date(batida.timestamp_servidor || `2000-01-01T${batida}`);

      if (batida.tipo === 'entrada' || batida.tipo === 'retorno') {
        inicioTrabalho = timestamp;
      } else if ((batida.tipo === 'pausa' || batida.tipo === 'saida') && inicioTrabalho) {
        minutosNoturnos += this.calcularMinutosNoturnos(inicioTrabalho, timestamp);
        inicioTrabalho = null;
      }
    }

    return minutosNoturnos;
  }

  static calcularMinutosNoturnos(inicio, fim) {
    let minutos = 0;
    const current = new Date(inicio);

    while (current < fim) {
      const hora = current.getHours();
      if (hora >= HORARIO_NOTURNO_INICIO || hora < HORARIO_NOTURNO_FIM) {
        minutos++;
      }
      current.setMinutes(current.getMinutes() + 1);
    }

    return minutos;
  }

  static verificarInterjornada(saidaAnterior, entradaAtual) {
    if (!saidaAnterior || !entradaAtual) return { valida: true, horasDescanso: null };

    const saida = new Date(saidaAnterior);
    const entrada = new Date(entradaAtual);
    const diferencaHoras = (entrada - saida) / (1000 * 60 * 60);

    return {
      valida: diferencaHoras >= INTERJORNADA_MINIMA_HORAS,
      horasDescanso: Math.round(diferencaHoras * 10) / 10,
      minimoNecessario: INTERJORNADA_MINIMA_HORAS
    };
  }

  static calcularBancoDeHoras(jornadasDoMes, jornadaDiariaMinutos = JORNADA_PADRAO_MINUTOS) {
    let saldoMinutos = 0;

    for (const jornada of jornadasDoMes) {
      if (jornada.status === 'rejeitada') continue;

      const trabalhado = jornada.total_minutos_trabalhados || 0;
      const diferenca = trabalhado - jornadaDiariaMinutos;
      saldoMinutos += diferenca;
    }

    return {
      saldoMinutos,
      saldoFormatado: this.formatarSaldoMinutos(saldoMinutos),
      positivo: saldoMinutos >= 0
    };
  }

  static calcularResumoMensal(jornadas, configUsuario = {}) {
    const jornadaDiariaMinutos = (configUsuario.carga_horaria || 8) * 60;
    const diasUteis = configUsuario.dias_uteis || 22;

    let totalTrabalhadoMinutos = 0;
    let totalExtrasMinutos = 0;
    let totalAtrasoMinutos = 0;
    let totalNoturnasMinutos = 0;
    let diasTrabalhados = 0;
    let diasFalta = 0;
    let diasComAtraso = 0;

    for (const jornada of jornadas) {
      if (jornada.status === 'rejeitada') continue;

      const trabalhado = jornada.total_minutos_trabalhados || 0;

      if (trabalhado > 0) {
        diasTrabalhados++;
        totalTrabalhadoMinutos += trabalhado;

        const extras = this.calcularHorasExtras(trabalhado, jornadaDiariaMinutos);
        totalExtrasMinutos += extras;

        if (jornada.atraso_minutos > 0) {
          totalAtrasoMinutos += jornada.atraso_minutos;
          diasComAtraso++;
        }
      } else if (jornada.status !== 'aberta') {
        diasFalta++;
      }
    }

    const bancoHoras = this.calcularBancoDeHoras(jornadas, jornadaDiariaMinutos);

    return {
      totalTrabalhadoMinutos,
      totalTrabalhadoFormatado: this.formatarMinutos(totalTrabalhadoMinutos),
      totalExtrasMinutos,
      totalExtrasFormatado: this.formatarMinutos(totalExtrasMinutos),
      totalAtrasoMinutos,
      totalAtrasoFormatado: this.formatarMinutos(totalAtrasoMinutos),
      totalNoturnasMinutos,
      totalNoturnasFormatado: this.formatarMinutos(totalNoturnasMinutos),
      diasTrabalhados,
      diasFalta,
      diasComAtraso,
      diasUteis,
      bancoHoras,
      mediaDiariaMinutos: diasTrabalhados > 0 ? Math.round(totalTrabalhadoMinutos / diasTrabalhados) : 0
    };
  }

  static analisarJornada(jornada, batidas, configUsuario = {}) {
    const jornadaDiariaMinutos = (configUsuario.carga_horaria || 8) * 60;
    const horaEntrada = configUsuario.hora_entrada_padrao || '09:00';
    const horaSaida = configUsuario.hora_saida_padrao || '18:00';
    const tolerancia = configUsuario.tolerancia_minutos || TOLERANCIA_ATRASO_MINUTOS;

    const trabalhado = jornada?.total_minutos_trabalhados || 0;
    const horasExtras = this.calcularHorasExtras(trabalhado, jornadaDiariaMinutos);

    let atrasoMinutos = 0;
    let saidaAntecipadaMinutos = 0;

    if (batidas && batidas.length > 0) {
      const primeiraEntrada = batidas.find(b => b.tipo === 'entrada');
      const ultimaSaida = [...batidas].reverse().find(b => b.tipo === 'saida');

      if (primeiraEntrada) {
        const horaEntradaReal = new Date(primeiraEntrada.timestamp_servidor)
          .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
        atrasoMinutos = this.calcularAtraso(horaEntradaReal, horaEntrada, tolerancia);
      }

      if (ultimaSaida) {
        const horaSaidaReal = new Date(ultimaSaida.timestamp_servidor)
          .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
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
      irregularidades.push({ tipo: 'hora_extra', minutos: horasExtras });
    }

    return {
      trabalhado,
      trabalhadoFormatado: this.formatarMinutos(trabalhado),
      horasExtras,
      horasExtrasFormatado: this.formatarMinutos(horasExtras),
      atrasoMinutos,
      saidaAntecipadaMinutos,
      irregularidades,
      deficit: Math.max(0, jornadaDiariaMinutos - trabalhado),
      excedente: Math.max(0, trabalhado - jornadaDiariaMinutos)
    };
  }

  // -- utilitários --

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
