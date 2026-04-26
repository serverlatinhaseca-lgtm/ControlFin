# ControlFin

ControlFin é um sistema web self-hosted para gestão financeira, cobrança, atendimento, emissão operacional de notas e tarefas, atribuição de clientes e preparação para integração ContaAzul multiempresa.

Esta primeira parte entrega a base Docker do projeto com:

- Frontend React com Vite, TailwindCSS, Axios, React Router e Lucide React
- Backend Node.js com Express
- PostgreSQL 16 Alpine
- Nginx servindo o frontend e fazendo proxy de `/api` para o backend
- Instalação via script único

## Instalação

Execute:

```bash
curl -fsSL https://raw.githubusercontent.com/serverlatinhaseca-lgtm/ControlFin/main/install.sh | bash
```

## Acesso

Abra no navegador:

```text
http://localhost
```

## Credenciais padrão

As credenciais padrão serão usadas nas próximas partes do sistema:

```text
Usuário Financeiro / admin123
Usuário Cobrador Atendente / admin123
Usuária Diretoria Cobrança / admin123
Usuário Diretor Geral / admin123
Usuário Atendente / admin123
```

## Comandos úteis

```bash
docker compose ps
```

```bash
docker compose logs -f backend
```

```bash
docker compose up -d --build
```

```bash
docker compose down -v
```

## Temas

O ControlFin usa dois temas fixos:

- Tema claro com tons de ciano
- Tema escuro com tons de roxo

Não há seletor de cores personalizadas.

## ContaAzul

A integração ContaAzul multiempresa será preparada para duas unidades em partes futuras do projeto.

## Rotas mínimas desta base

```text
GET /api/health
GET /api/setup/status
```

## Porta de acesso

O frontend é servido pelo Nginx na porta 80:

```text
http://localhost
```

O backend usa a porta interna 3001 e deve registrar:

```text
API on 3001
```
