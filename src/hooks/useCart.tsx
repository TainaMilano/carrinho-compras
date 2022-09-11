import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface ProductData {
  id: number;
  title: string;
  price: number;
  image: string;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      const productExistsInCart = cart.find(
        (productCart) => productCart.id === productId
      );

      const amount =
        !!productExistsInCart && productExistsInCart?.id > 0
          ? productExistsInCart.amount + 1
          : 1;

      if (amount <= stock.amount) {
        if (!!productExistsInCart && productExistsInCart?.id > 0) {
          const product = cart.map((productCart) => {
            if (productCart.id === productId) {
              return {
                ...productExistsInCart,
                amount: productCart.amount + 1,
              };
            }

            return productCart;
          });
          setCart(product);

          localStorage.setItem("@RocketShoes:cart", JSON.stringify(product));
        } else {
          const response = await api.get<ProductData>(`products/${productId}`);
          const product = response.data;

          const productList = [...cart, { ...product, amount: 1 }];
          setCart(productList);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(productList)
          );
        }
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((cartItem) => cartItem.id === productId);

      if (!!product && product?.id > 0) {
        const cartUpdated = cart.filter(
          (cartItem) => cartItem.id !== productId
        );
        setCart(cartUpdated);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartUpdated));
      } else {
        toast.error("Erro na remoção do produto");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount > 0) {
        const { data: stock } = await api.get(`/stock/${productId}`);

        if (stock.amount <= amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const updatedList = cart.map((productCart) => {
          if (productCart.id === productId) {
            return {
              ...productCart,
              amount,
            };
          }

          return productCart;
        });

        setCart(updatedList);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedList));
      } else {
        toast.error("A quantidade deve ser maior que zero");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
