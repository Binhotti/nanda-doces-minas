# Nanda Doces de Minas

Landing page em Next.js com catálogo de doces, carrinho e envio do pedido completo pelo WhatsApp. A página `/produtos` mostra o catálogo completo. A área `/admin` permite cadastrar, editar, ocultar, destacar e excluir produtos, além de definir preço promocional e enviar fotos.

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

No desenvolvimento local, o catálogo usa SQLite em `data/products.sqlite` e as fotos ficam em `public/uploads/`. Ambos estão fora do Git. A logo fornecida está em `public/brand/logo.webp`.

Toda foto enviada pelo painel é otimizada automaticamente antes de ser salva (`lib/images.ts`, com `sharp`): a rotação do celular é aplicada, o maior lado é limitado a 1600 px, os metadados (inclusive localização) são removidos e o arquivo é convertido para WebP. Na loja, as imagens são servidas com `next/image`, em tamanhos adequados a cada tela. Imagens fixas do site (logo, retrato) devem ser colocadas em `public/brand/` já em WebP.

Na Vercel, o catálogo e as fotos usam um Vercel Blob privado conectado ao projeto. Configure `ADMIN_PASSWORD`, `SESSION_SECRET` e `NEXT_PUBLIC_WHATSAPP_NUMBER` nas variáveis de ambiente da Vercel; a conexão com o Blob fornece `BLOB_STORE_ID` e autenticação OIDC sem chave estática. O painel fica desativado até que o armazenamento e as credenciais estejam configurados. O arquivo SQLite local não é migrado automaticamente para a nuvem.

## Comandos

```bash
npm run dev
npm run typecheck
npm run build
```

## Próximos passos

Adicionar as fotos e os valores reais enviados pela cliente, tratar as imagens para fundo branco uniforme, revisar o texto com ela e escolher a hospedagem com armazenamento persistente.
