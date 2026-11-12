import React, { createContext, useContext, useState } from 'react';
import { Product, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  orderDiscount: number;
  taxAmount: number;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setLineDiscount: (productId: string, discount: number) => void;
  setOrderDiscount: (discount: number) => void;
  clearCart: () => void;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [taxAmount] = useState<number>(0);

  const addItem = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      }
      return [...prev, { product, quantity, lineDiscount: 0 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const setLineDiscount = (productId: string, discount: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, lineDiscount: Math.max(0, discount) } : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setOrderDiscount(0);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  const lineDiscounts = items.reduce((sum, item) => sum + item.lineDiscount, 0);
  const discountTotal = lineDiscounts + orderDiscount;
  const grandTotal = Math.max(0, subtotal - discountTotal + taxAmount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        orderDiscount,
        taxAmount,
        addItem,
        updateQuantity,
        removeItem,
        setLineDiscount,
        setOrderDiscount,
        clearCart,
        subtotal,
        discountTotal,
        grandTotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

