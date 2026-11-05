# Nanda Doces de Minas

Landing page em Next.js com catálogo de doces, carrinho e envio do pedido completo pelo WhatsApp. A área `/admin` permite cadastrar, editar, ocultar, destacar e excluir produtos, além de definir preço promocional e enviar fotos.

## Começar

Requer Node.js 22 ou superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000` para a loja e `http://localhost:3000/admin` para o painel. No Windows PowerShell, use `Copy-Item .env.example .env.local` no lugar de `cp` se preferir.

Defina no `.env.local`:

- `ADMIN_PASSWORD`: senha da Nanda para acessar o painel.
- `SESSION_SECRET`: chave aleatória de pelo menos 32 caracteres para proteger a sessão.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: número com código do país e DDD, apenas dígitos. Ex.: `5547992103914`.

## Dados e imagens

O catálogo usa SQLite em `data/products.sqlite`. As fotos enviadas pelo painel ficam em `public/uploads/`. Ambos estão fora do Git para proteger os dados e evitar arquivos grandes no repositório. A logo fornecida está em `public/brand/logo.png`.

Esta primeira versão está pronta para desenvolvimento local. Antes de publicar em uma hospedagem sem disco persistente, migre o catálogo e os uploads para um banco e armazenamento duráveis, como PostgreSQL e armazenamento de objetos. Configure as variáveis de ambiente na hospedagem e faça backup dos dados.

## Comandos

```bash
npm run dev
npm run typecheck
npm run build
```

## Próximos passos

Adicionar as fotos e os valores reais enviados pela cliente, tratar as imagens para fundo branco uniforme, revisar o texto com ela e escolher a hospedagem com armazenamento persistente.
