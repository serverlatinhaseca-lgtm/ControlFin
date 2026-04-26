#!/usr/bin/env bash

set -euo pipefail

REPO_URL="https://github.com/serverlatinhaseca-lgtm/ControlFin.git"
PROJECT_NAME="ControlFin"

SUDO=""
COMPOSE_MODE=""

log() {
  echo "[ControlFin] $1"
}

fail() {
  echo "[ControlFin] Erro: $1" >&2
  exit 1
}

on_error() {
  echo "[ControlFin] Instalação interrompida por erro." >&2
  exit 1
}

trap on_error ERR

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

prepare_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
    return
  fi

  if command_exists sudo; then
    SUDO="sudo"
    return
  fi

  fail "sudo não encontrado. Execute como root ou instale sudo."
}

ensure_git() {
  if command_exists git; then
    log "Git encontrado."
    return
  fi

  fail "Git não encontrado. Instale o Git antes de continuar."
}

ensure_curl() {
  if command_exists curl; then
    log "curl encontrado."
    return
  fi

  fail "curl não encontrado. Instale o curl antes de continuar."
}

install_docker_if_needed() {
  if command_exists docker; then
    log "Docker encontrado."
    return
  fi

  log "Docker não encontrado. Instalando Docker."
  prepare_sudo

  if [ "$(uname -s)" != "Linux" ]; then
    fail "Instalação automática do Docker suportada apenas em Linux."
  fi

  curl -fsSL https://get.docker.com -o /tmp/controlfin-get-docker.sh
  ${SUDO} sh /tmp/controlfin-get-docker.sh
  rm -f /tmp/controlfin-get-docker.sh

  if command_exists systemctl; then
    ${SUDO} systemctl enable docker >/dev/null 2>&1 || true
    ${SUDO} systemctl start docker >/dev/null 2>&1 || true
  fi

  log "Docker instalado."
}

check_docker_access() {
  if docker info >/dev/null 2>&1; then
    SUDO=""
    log "Acesso ao Docker confirmado."
    return
  fi

  prepare_sudo

  if ${SUDO} docker info >/dev/null 2>&1; then
    log "Acesso ao Docker confirmado com sudo."
    return
  fi

  fail "Não foi possível acessar o Docker."
}

run_docker() {
  ${SUDO} docker "$@"
}

check_docker_compose() {
  if run_docker compose version >/dev/null 2>&1; then
    COMPOSE_MODE="plugin"
    log "Docker Compose encontrado."
    return
  fi

  if command_exists docker-compose; then
    COMPOSE_MODE="legacy"
    log "Docker Compose encontrado."
    return
  fi

  fail "Docker Compose não encontrado."
}

run_compose() {
  if [ "$COMPOSE_MODE" = "plugin" ]; then
    run_docker compose "$@"
    return
  fi

  ${SUDO} docker-compose "$@"
}

clone_or_update_repository() {
  if [ -d "$PROJECT_NAME/.git" ]; then
    log "Repositório existente encontrado. Atualizando."
    cd "$PROJECT_NAME"
    git pull --ff-only
    return
  fi

  if [ -d "$PROJECT_NAME" ]; then
    fail "Diretório $PROJECT_NAME já existe, mas não é um repositório Git válido."
  fi

  log "Clonando repositório."
  git clone "$REPO_URL" "$PROJECT_NAME"
  cd "$PROJECT_NAME"
}

generate_hex_secret() {
  local bytes="$1"

  if command_exists openssl; then
    openssl rand -hex "$bytes"
    return
  fi

  od -An -N "$bytes" -tx1 /dev/urandom | tr -d ' \n'
}

replace_value() {
  local search="$1"
  local replace="$2"
  local file="$3"
  local temp_file="${file}.tmp"

  sed "s|${search}|${replace}|g" "$file" > "$temp_file"
  mv "$temp_file" "$file"
}

prepare_env_file() {
  if [ ! -f ".env.example" ]; then
    fail ".env.example não encontrado."
  fi

  if [ ! -f ".env" ]; then
    log "Criando .env a partir de .env.example."
    cp .env.example .env
  else
    log ".env encontrado. Mantendo configuração existente."
  fi

  if grep -q "change_me_controlfin" .env; then
    local postgres_password
    postgres_password="$(generate_hex_secret 24)"
    replace_value "change_me_controlfin" "$postgres_password" ".env"
    log "POSTGRES_PASSWORD gerado."
  fi

  if grep -q "change_me_jwt_secret" .env; then
    local jwt_secret
    jwt_secret="$(generate_hex_secret 32)"
    replace_value "change_me_jwt_secret" "$jwt_secret" ".env"
    log "JWT_SECRET gerado."
  fi
}

start_application() {
  log "Construindo e iniciando containers."
  run_compose up -d --build
}

print_success_message() {
  log "Instalação concluída."
  echo
  echo "[ControlFin] URL de acesso:"
  echo "http://localhost"
  echo
  echo "[ControlFin] Credenciais padrão:"
  echo "Usuário Financeiro / admin123"
  echo "Usuário Cobrador Atendente / admin123"
  echo "Usuária Diretoria Cobrança / admin123"
  echo "Usuário Diretor Geral / admin123"
  echo "Usuário Atendente / admin123"
  echo
  echo "[ControlFin] Comandos úteis:"
  echo "docker compose ps"
  echo "docker compose logs -f backend"
  echo "docker compose up -d --build"
  echo "docker compose down -v"
}

main() {
  log "Iniciando instalação."
  ensure_git
  ensure_curl
  install_docker_if_needed
  check_docker_access
  check_docker_compose
  clone_or_update_repository
  prepare_env_file
  start_application
  print_success_message
}

main "$@"
