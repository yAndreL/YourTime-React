#!/usr/bin/env node

/**
 * Script de setup automático para o YourTime
 * Este script configura o ambiente de desenvolvimento automaticamente
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Iniciando setup do YourTime...\n');

// Verificar se Node.js está instalado
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js detectado: ${nodeVersion}`);
} catch (error) {
  console.error('❌ Node.js não encontrado. Por favor, instale Node.js versão 16 ou superior.');
  process.exit(1);
}

// Verificar se npm está instalado
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm detectado: ${npmVersion}`);
} catch (error) {
  console.error('❌ npm não encontrado.');
  process.exit(1);
}

// Verificar se existe arquivo .env
if (!fs.existsSync('.env')) {
  console.log('📝 Arquivo .env não encontrado, criando a partir do .env.example...');
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ Arquivo .env criado com sucesso!');
    console.log('⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações antes de continuar.');
  } else {
    console.error('❌ Arquivo .env.example não encontrado.');
    process.exit(1);
  }
} else {
  console.log('✅ Arquivo .env já existe.');
}

// Instalar dependências
console.log('\n📦 Instalando dependências...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependências instaladas com sucesso!');
} catch (error) {
  console.error('❌ Erro ao instalar dependências:', error.message);
  process.exit(1);
}

// Verificar se o build funciona
console.log('\n🔧 Testando build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build realizado com sucesso!');
} catch (error) {
  console.log('⚠️  Build falhou, mas isso é normal se as configurações ainda não foram definidas.');
}

console.log('\n🎉 Setup concluído com sucesso!');
console.log('\n📋 Próximos passos:');
console.log('1. Edite o arquivo .env com suas configurações');
console.log('2. Execute: npm run dev:full');
console.log('3. Acesse: http://localhost:5173 (frontend) e http://localhost:3001 (backend)');
console.log('\n📖 Para mais informações, consulte o README.md');
