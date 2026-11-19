// Regras de estoque que valem no painel e na loja (sem acesso ao banco, pode ir ao navegador).
// stock === null significa "sem controle": o produto não tem limite de unidades.
export const LOW_STOCK_BELOW = 2;
export const MAX_STOCK = 99999;

type WithStock = { stock: number | null };

export const isSoldOut = (product: WithStock) => product.stock !== null && product.stock <= 0;
export const isLowStock = (product: WithStock) => product.stock !== null && product.stock > 0 && product.stock < LOW_STOCK_BELOW;
/** Quantas unidades uma pessoa pode pedir. Infinity quando o estoque não é controlado. */
export const maxQuantity = (product: WithStock) => (product.stock === null ? Infinity : Math.max(0, product.stock));
