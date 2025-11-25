/**
 * NFT Ticket Mint Component
 * 
 * Allows users to mint NFT tickets for events, matches, concerts, museums
 * 
 * Features:
 * - Select ticket type (football, university, museum, concert, event)
 * - Enter event details
 * - Mint NFT ticket
 * - Display minted ticket info
 */

'use client';

import { useState } from 'react';
import { stellar } from '@/lib/stellar-helper';
import { nftTicketHelper, TicketType, TicketMetadata, NFTTicket } from '@/lib/nft-ticket-helper';
import { FaTicketAlt, FaCheckCircle } from 'react-icons/fa';
import { Card, Input, Button, Alert } from './example-components';

interface NFTTicketMintProps {
  publicKey: string;
  onSuccess?: () => void;
}

export default function NFTTicketMint({ publicKey, onSuccess }: NFTTicketMintProps) {
  const [ticketType, setTicketType] = useState<TicketType>('event');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [mintedTicket, setMintedTicket] = useState<{ assetCode: string; txHash: string } | null>(null);

  const ticketTypes: { value: TicketType; label: string; icon: string }[] = [
    { value: 'football', label: 'Maç Katılım Rozeti', icon: '⚽' },
    { value: 'university', label: 'Etkinlik Hatıra NFT\'si', icon: '🎓' },
    { value: 'museum', label: 'Dijital Müze Bileti', icon: '🏛️' },
    { value: 'concert', label: 'Konser Bileti', icon: '🎵' },
    { value: 'event', label: 'Genel Etkinlik Bileti', icon: '🎫' },
  ];

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim() || !eventDate.trim()) {
      setAlert({
        type: 'error',
        message: 'Etkinlik adı ve tarihi zorunludur.',
      });
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      setMintedTicket(null);

      // Generate unique ticket ID
      const ticketId = `${ticketType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create metadata
      const metadata: TicketMetadata = {
        ticketId,
        type: ticketType,
        eventName: eventName.trim(),
        eventDate: eventDate.trim(),
        location: location.trim() || undefined,
        organizer: organizer.trim() || undefined,
        description: description.trim() || undefined,
        mintedAt: new Date().toISOString(),
      };

      // For demo purposes, we'll simulate minting
      // In production, this would call the actual mint function
      // which requires an issuer keypair (typically a service account)
      
      // Simulate minting process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate asset code
      const assetCode = nftTicketHelper.generateAssetCode(ticketType, eventName, ticketId);
      
      // In a real implementation, you would:
      // 1. Call backend API to mint the ticket (with service account)
      // 2. Or use a smart contract if available
      // 3. Store metadata on-chain or in IPFS
      
      // For now, we'll create a mock transaction hash
      const mockTxHash = 'mock_' + Math.random().toString(36).substring(7);

      // Save ticket to local storage for demo purposes
      const ticketData: NFTTicket = {
        assetCode,
        issuer: publicKey, // Using user's public key as issuer for demo
        balance: '1',
        metadata,
      };

      // Get existing tickets from local storage
      const storageKey = `nft_tickets_${publicKey}`;
      const existingTickets = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingTickets.push(ticketData);
      localStorage.setItem(storageKey, JSON.stringify(existingTickets));

      setMintedTicket({
        assetCode,
        txHash: mockTxHash,
      });

      setAlert({
        type: 'success',
        message: 'NFT Ticket başarıyla oluşturuldu! 🎉',
      });

      // Clear form
      setEventName('');
      setEventDate('');
      setLocation('');
      setOrganizer('');
      setDescription('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Mint error:', error);
      setAlert({
        type: 'error',
        message: `Bilet oluşturulamadı: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = nftTicketHelper.getTicketTypeInfo(ticketType);

  return (
    <Card>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FaTicketAlt className="text-purple-400 text-lg" />
        NFT Ticket Oluştur
      </h2>

      {alert && (
        <div className="mb-4">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {mintedTicket && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <FaCheckCircle className="text-green-400 text-xl flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-green-400 font-semibold mb-2">Ticket Oluşturuldu!</p>
              <p className="text-white/70 text-sm mb-1">
                <strong>Asset Code:</strong> {mintedTicket.assetCode}
              </p>
              <p className="text-white/70 text-sm mb-2">
                <strong>Transaction Hash:</strong> {mintedTicket.txHash}
              </p>
              <p className="text-white/60 text-xs">
                💡 Bu bir demo versiyondur. Gerçek uygulamada ticket Stellar blockchain'de mint edilir.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleMint} className="space-y-3">
        {/* Ticket Type Selection */}
        <div>
          <label className="block text-white/80 text-xs mb-2">Bilet Türü</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ticketTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setTicketType(type.value)}
                className={`p-2.5 rounded-lg border-2 transition-all ${
                  ticketType === type.value
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="text-xl mb-1">{type.icon}</div>
                <div className="text-white text-xs font-semibold leading-tight">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Event Name */}
        <Input
          label="Etkinlik Adı *"
          placeholder="Örn: Galatasaray vs Fenerbahçe, Konser 2024, Müze Sergisi"
          value={eventName}
          onChange={setEventName}
        />

        {/* Event Date - Custom Calendar Style */}
        <div>
          <label className="block text-white/80 text-sm mb-2">Etkinlik Tarihi *</label>
          <div className="relative">
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-white/5 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
              style={{
                colorScheme: 'dark',
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-2xl">📅</span>
            </div>
          </div>
          {eventDate && (
            <div className="mt-3 p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-400/40 flex flex-col items-center justify-center flex-shrink-0">
                  <p className="text-white/80 text-[9px] font-semibold uppercase tracking-wider">
                    {new Date(eventDate).toLocaleDateString('tr-TR', { month: 'short' })}
                  </p>
                  <p className="text-white text-xl font-black leading-none">
                    {new Date(eventDate).getDate()}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-xs mb-0.5">Seçilen Tarih</p>
                  <p className="text-white font-semibold text-sm">
                    {new Date(eventDate).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <Input
          label="Konum (Opsiyonel)"
          placeholder="Örn: Türk Telekom Stadyumu, İstanbul"
          value={location}
          onChange={setLocation}
        />

        {/* Organizer */}
        <Input
          label="Organizatör (Opsiyonel)"
          placeholder="Örn: Galatasaray SK, İTÜ, İstanbul Modern"
          value={organizer}
          onChange={setOrganizer}
        />

        {/* Description */}
        <div>
          <label className="block text-white/80 text-xs mb-2">Açıklama (Opsiyonel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Etkinlik hakkında detaylar..."
            rows={2}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
          />
        </div>

        {/* Info Box */}
        <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-200/90 text-xs leading-relaxed">
            💡 <strong>Bilgi:</strong> NFT ticket'lar Stellar blockchain'de mint edilir. 
            Süratli mint, ucuz mint, metadata desteği ve transfer kolaylığı sağlar.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <Button
            onClick={() => {}}
            variant="primary"
            disabled={loading || !eventName.trim() || !eventDate.trim()}
            fullWidth
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
                Oluşturuluyor...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FaTicketAlt />
                NFT Ticket Oluştur
              </span>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

