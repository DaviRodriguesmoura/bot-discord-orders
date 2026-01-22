const { ComponentType, ButtonStyle } = require("discord-api-types/v10");
const { api, getStore, db, formatPrice } = require(".");

module.exports = {
  ProductMessage: async (productId) => {
    if (!productId) {
      console.error("❌ ProductMessage chamado sem productId");
      return null;
    }

    const productRaw = db.get(`product:${productId}`);

    if (!productRaw || !productRaw.id) {
      console.error("❌ Produto não encontrado no banco:", productId);
      return null;
    }

    let product;
    try {
      const req = await api.get(`/open-api/catalog/product/${productRaw.id}`);
      product = req.data;
    } catch (err) {
      console.error("❌ Erro ao buscar produto na API:", err.message);
      return null;
    }

    const store = getStore();

    return {
      embeds: [
        {
          title: productRaw.title || "Produto",
          description: productRaw.description || "Descrição indisponível",
          image: productRaw.image ? { url: productRaw.image } : undefined,
          footer: productRaw.footer ? { text: productRaw.footer } : undefined,
        },
      ],
      components:
        product.type === "DEFAULT"
          ? [
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    custom_id: `buy-product:${productRaw.id}`,
                    label: "Comprar Produto",
                    type: ComponentType.Button,
                    style: ButtonStyle.Success,
                    disabled: !product?.inventory?.hasStock,
                  },
                  {
                    type: ComponentType.Button,
                    style: ButtonStyle.Link,
                    label: "Ver no site",
                    url: new URL(`/products/${product.info.slug}`, store.url).toString(),
                  },
                ],
              },
            ]
          : [
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    custom_id: `buy-product:${productRaw.id}`,
                    type: ComponentType.StringSelect,
                    placeholder: "Selecione uma variação",
                    options: product.variants.map((variant) => ({
                      label: variant.title.slice(0, 25),
                      description: `${formatPrice(variant.price)} | ${
                        variant.inventory.stock === null
                          ? "∞"
                          : variant.inventory.stock > 0
                          ? `${variant.inventory.stock} em estoque`
                          : "Esgotado"
                      }`,
                      value: variant.id,
                      emoji: "📦",
                    })),
                  },
                ],
              },
            ],
    };
  },

  CheckoutPanel: async ({ interaction, checkoutId, product = null }) => {
    const checkout = db.get(`checkout:${checkoutId}`);

    if (!checkout) {
      console.error("❌ Checkout não encontrado:", checkoutId);
      return null;
    }

    if (!product) {
      try {
        const req = await api.get("/open-api/catalog/product/" + checkout.productId);
        product = req.data;
      } catch (err) {
        console.error("❌ Erro ao buscar produto do checkout:", err.message);
        return null;
      }
    }

    const inventory =
      product.type === "VARIANT"
        ? product.variants.find((v) => v.id === checkout.variantId)?.inventory
        : product.inventory;

    if (!inventory) {
      console.error("❌ Inventário inválido:", checkoutId);
      return null;
    }

    checkout.total = checkout.quantity * checkout.unitPrice;

    if (checkout.coupon) {
      if (checkout.coupon.type === "PERCENTAGE") {
        checkout.total -= checkout.total * (checkout.coupon.amount / 100);
      } else if (checkout.coupon.type === "FIXED") {
        checkout.total -= checkout.coupon.amount;
      }
    }

    db.set(`checkout:${checkoutId}`, checkout);

    return {
      embeds: [
        {
          title: "🛒 Carrinho de compras",
          description: `Olá ${interaction.user}, revise seu pedido abaixo e continue para finalizar.`,
        },
        {
          title: `📦 ${product.info.title}`,
          image: product.info.mainImage ? { url: product.info.mainImage } : undefined,
          fields: [
            {
              name: "Preço:",
              value: `\`\`\`${formatPrice(checkout.total)}\`\`\``,
            },
            {
              name: "Quantidade:",
              value: `\`\`\`${checkout.quantity}\`\`\``,
            },
            checkout.coupon
              ? {
                  name: "Cupom aplicado:",
                  value: `\`\`\`${checkout.coupon.code} - ${
                    checkout.coupon.type === "PERCENTAGE"
                      ? `${checkout.coupon.amount}%`
                      : formatPrice(checkout.coupon.amount)
                  }\`\`\``,
                }
              : null,
          ].filter(Boolean),
        },
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              custom_id: "continue-checkout",
              type: ComponentType.Button,
              label: "Continuar",
              style: ButtonStyle.Success,
            },
            {
              custom_id: "remove-quantity",
              type: ComponentType.Button,
              label: "-",
              style: ButtonStyle.Secondary,
              disabled: checkout.quantity <= 1,
            },
            {
              custom_id: "add-quantity",
              type: ComponentType.Button,
              label: "+",
              style: ButtonStyle.Secondary,
              disabled:
                inventory.stock !== null
                  ? checkout.quantity >= inventory.stock
                  : checkout.quantity >= 1000,
            },
            {
              custom_id: "add-coupon",
              type: ComponentType.Button,
              label: "Adicionar cupom",
              style: ButtonStyle.Primary,
              disabled: !!checkout.coupon,
            },
            {
              custom_id: "cancel-checkout",
              type: ComponentType.Button,
              label: "Cancelar compra",
              style: ButtonStyle.Danger,
            },
          ],
        },
      ],
    };
  },
};
