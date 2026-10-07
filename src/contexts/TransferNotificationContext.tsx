import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useMockAuth } from "@/contexts/MockAuthContext";
import { getPendingDocuments } from "@/services/inboxService";
import { supabase } from "@/integrations/supabase/client";

interface TransferNotificationContextType {
  hasUnreadTransfers: boolean;
  unreadCount: number;
  markTransfersAsRead: () => void;
  clearUnreadNotification: () => void;
  refreshUnreadTransfers: () => Promise<void>;
}

const TransferNotificationContext = createContext<TransferNotificationContextType>({
  hasUnreadTransfers: false,
  unreadCount: 0,
  markTransfersAsRead: () => {},
  clearUnreadNotification: () => {},
  refreshUnreadTransfers: async () => {},
});

export const useTransferNotification = () => useContext(TransferNotificationContext);

export const TransferNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasUnreadTransfers, setHasUnreadTransfers] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { supabaseUser } = useMockAuth();
  const location = useLocation();

  const isTransfersRoute = useCallback((pathname: string) => {
    return pathname === "/transfers" || pathname === "/dashboard/transfers";
  }, []);

  const markTransfersAsRead = useCallback(() => {
    setHasUnreadTransfers(false);
    setUnreadCount(0);
  }, []);

  const clearUnreadNotification = markTransfersAsRead;

  const refreshUnreadTransfers = useCallback(async () => {
    if (!supabaseUser?.id) {
      setHasUnreadTransfers(false);
      setUnreadCount(0);
      return;
    }

    // Si ya estamos en la vista de transferencias, consideramos leídos los avisos
    if (isTransfersRoute(location.pathname)) {
      setHasUnreadTransfers(false);
      setUnreadCount(0);
      return;
    }

    try {
      const docs = await getPendingDocuments(supabaseUser.id);
      const count = docs.length;
      if (count > 0) {
        setHasUnreadTransfers(true);
        setUnreadCount(count);
      } else {
        setHasUnreadTransfers(false);
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn("Error consultando documentos pendientes para notificación:", err);
    }
  }, [supabaseUser?.id, location.pathname, isTransfersRoute]);

  // Al navegar a la vista de transferencias, limpiar inmediatamente el estado
  useEffect(() => {
    if (isTransfersRoute(location.pathname)) {
      markTransfersAsRead();
    }
  }, [location.pathname, isTransfersRoute, markTransfersAsRead]);

  // Sincronización inicial y escucha en tiempo real vía Supabase Realtime
  useEffect(() => {
    if (!supabaseUser?.id) {
      setHasUnreadTransfers(false);
      setUnreadCount(0);
      return;
    }

    refreshUnreadTransfers();

    const channel = supabase
      .channel(`pending_docs_notify_${supabaseUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pending_documents",
          filter: `recipient_id=eq.${supabaseUser.id}`,
        },
        () => {
          refreshUnreadTransfers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseUser?.id, refreshUnreadTransfers]);

  return (
    <TransferNotificationContext.Provider
      value={{
        hasUnreadTransfers,
        unreadCount,
        markTransfersAsRead,
        clearUnreadNotification,
        refreshUnreadTransfers,
      }}
    >
      {children}
    </TransferNotificationContext.Provider>
  );
};
