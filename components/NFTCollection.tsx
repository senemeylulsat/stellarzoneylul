/**
 * NFT Collection Component
 * 
 * Displays user's NFT ticket collection
 * 
 * Features:
 * - Show all owned NFT tickets
 * - Filter by ticket type
 * - Display ticket details
 * - Transfer tickets
 */

'use client';

import { useState, useEffect } from 'react';
import { nftTicketHelper, NFTTicket, TicketType } from '@/lib/nft-ticket-helper';
import { stellar } from '@/lib/stellar-helper';
import { FaTicketAlt, FaFilter, FaSync, FaTrash, FaComment, FaTimes } from 'react-icons/fa';
import { Card, EmptyState, Modal } from './example-components';

interface NFTCollectionProps {
  publicKey: string;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export default function NFTCollection({ publicKey }: NFTCollectionProps) {
  const [tickets, setTickets] = useState<NFTTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<NFTTicket[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<TicketType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<NFTTicket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  const fetchTickets = async () => {
    try {
      setRefreshing(true);
      
      // Get tickets from blockchain (if any)
      const blockchainTickets = await nftTicketHelper.getTickets(publicKey);
      
      // Get tickets from local storage (demo tickets)
      const storageKey = `nft_tickets_${publicKey}`;
      const localTickets: NFTTicket[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Combine both sources
      const allTickets = [...blockchainTickets, ...localTickets];
      
      setTickets(allTickets);
      applyFilter(allTickets, selectedFilter);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      // Fallback to local storage only
      try {
        const storageKey = `nft_tickets_${publicKey}`;
        const localTickets: NFTTicket[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
        setTickets(localTickets);
        applyFilter(localTickets, selectedFilter);
      } catch (e) {
        console.error('Error loading from local storage:', e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (ticketList: NFTTicket[], filter: TicketType | 'all') => {
    if (filter === 'all') {
      setFilteredTickets(ticketList);
    } else {
      setFilteredTickets(ticketList.filter(t => t.metadata.type === filter));
    }
  };

  const deleteTicket = async (ticketToDelete: NFTTicket) => {
    // Confirm deletion
    if (!confirm(`"${ticketToDelete.metadata.eventName}" ticket'ını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`)) {
      return;
    }

    try {
      // Only delete local tickets (not blockchain tickets)
      if (!isLocalTicket(ticketToDelete)) {
        alert('Blockchain\'deki ticket\'lar silinemez. Sadece local ticket\'lar silinebilir.');
        return;
      }

      // Get tickets from local storage
      const storageKey = `nft_tickets_${publicKey}`;
      const localTickets: NFTTicket[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Remove the ticket by comparing assetCode and ticketId
      const updatedTickets = localTickets.filter(
        (t) => !(t.assetCode === ticketToDelete.assetCode && t.metadata.ticketId === ticketToDelete.metadata.ticketId)
      );
      
      // Save back to local storage
      localStorage.setItem(storageKey, JSON.stringify(updatedTickets));
      
      // Get blockchain tickets separately
      const blockchainTickets = await nftTicketHelper.getTickets(publicKey);
      
      // Combine updated local tickets with blockchain tickets
      const allTickets = [...blockchainTickets, ...updatedTickets];
      
      // Update state
      setTickets(allTickets);
      applyFilter(allTickets, selectedFilter);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Ticket silinirken bir hata oluştu.');
    }
  };

  const isLocalTicket = (ticket: NFTTicket): boolean => {
    // Check if ticket is from local storage (has issuer matching publicKey)
    return ticket.issuer === publicKey;
  };

  const loadComments = (ticket: NFTTicket) => {
    const commentsKey = `ticket_comments_${ticket.metadata.ticketId}`;
    const savedComments = JSON.parse(localStorage.getItem(commentsKey) || '[]');
    setComments(savedComments);
  };

  const openCommentsModal = (ticket: NFTTicket) => {
    setSelectedTicket(ticket);
    loadComments(ticket);
    setShowCommentsModal(true);
  };

  const closeCommentsModal = () => {
    setShowCommentsModal(false);
    setSelectedTicket(null);
    setNewComment('');
    setComments([]);
  };

  const addComment = () => {
    if (!newComment.trim() || !selectedTicket) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: stellar.formatAddress(publicKey, 4, 4),
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);

    // Save to local storage
    const commentsKey = `ticket_comments_${selectedTicket.metadata.ticketId}`;
    localStorage.setItem(commentsKey, JSON.stringify(updatedComments));

    setNewComment('');
  };

  const getCommentCount = (ticket: NFTTicket): number => {
    const commentsKey = `ticket_comments_${ticket.metadata.ticketId}`;
    const savedComments = JSON.parse(localStorage.getItem(commentsKey) || '[]');
    return savedComments.length;
  };

  useEffect(() => {
    if (publicKey) {
      fetchTickets();
    }
  }, [publicKey]);

  useEffect(() => {
    applyFilter(tickets, selectedFilter);
  }, [selectedFilter, tickets]);

  const ticketTypeFilters: { value: TicketType | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'Tümü', icon: '🎫' },
    { value: 'football', label: 'Maç Rozeti', icon: '⚽' },
    { value: 'university', label: 'Üniversite', icon: '🎓' },
    { value: 'museum', label: 'Müze', icon: '🏛️' },
    { value: 'concert', label: 'Konser', icon: '🎵' },
    { value: 'event', label: 'Etkinlik', icon: '🎫' },
  ];

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCalendarDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('tr-TR', { month: 'short' }),
      year: date.getFullYear(),
      dayName: date.toLocaleDateString('tr-TR', { weekday: 'short' }),
    };
  };

  if (loading) {
    return (
      <Card title="🎫 NFT Ticket Koleksiyonum">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-white/5 rounded-lg"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/50">
              <FaTicketAlt className="text-white text-base" />
            </div>
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              NFT Ticket Koleksiyonum
            </span>
          </h2>
          <p className="text-white/50 text-xs ml-11">Katıldığınız etkinliklerin dijital hatıraları</p>
        </div>
        <button
          onClick={fetchTickets}
          disabled={refreshing}
          className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg border border-white/20 hover:border-white/40 transition-all disabled:opacity-50 hover:scale-110 active:scale-95"
          title="Yenile"
        >
          <FaSync className={`text-base text-white ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="mb-5 flex flex-wrap gap-2">
        {ticketTypeFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedFilter(filter.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 transform ${
              selectedFilter === filter.value
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50 scale-105'
                : 'bg-white/5 backdrop-blur-sm text-white/70 hover:bg-white/10 hover:scale-105 border border-white/10'
            }`}
          >
            <span className="mr-1.5 text-sm">{filter.icon}</span>
            {filter.label}
          </button>
        ))}
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="Henüz Ticket Yok"
          description={
            selectedFilter === 'all'
              ? "Koleksiyonunuzda henüz NFT ticket bulunmuyor. Yeni ticket oluşturarak başlayın!"
              : "Bu kategoride ticket bulunmuyor."
          }
        />
      ) : (
        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredTickets.map((ticket, index) => {
            const typeInfo = nftTicketHelper.getTicketTypeInfo(ticket.metadata.type);
            
            // Different gradient colors based on ticket type
            const gradientColors = {
              football: 'from-green-500/30 via-emerald-500/20 to-teal-500/30',
              university: 'from-blue-500/30 via-indigo-500/20 to-purple-500/30',
              museum: 'from-purple-500/30 via-pink-500/20 to-rose-500/30',
              concert: 'from-pink-500/30 via-rose-500/20 to-red-500/30',
              event: 'from-orange-500/30 via-amber-500/20 to-yellow-500/30',
            };
            
            const borderColors = {
              football: 'border-green-400/40',
              university: 'border-blue-400/40',
              museum: 'border-purple-400/40',
              concert: 'border-pink-400/40',
              event: 'border-orange-400/40',
            };
            
            return (
              <div
                key={index}
                className={`group relative bg-gradient-to-br ${gradientColors[ticket.metadata.type]} backdrop-blur-xl ${borderColors[ticket.metadata.type]} border-2 rounded-xl p-5 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {/* Ticket Header with Icon */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="text-5xl transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                      {typeInfo.icon}
                    </div>
                    <div>
                      <p className="text-black font-bold text-xs uppercase tracking-wider mb-1">
                        {typeInfo.label}
                      </p>
                      <div className="h-1 w-12 bg-gradient-to-r from-white/50 to-transparent rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    {/* Delete Button - Only for local tickets */}
                    {isLocalTicket(ticket) && (
                      <button
                        onClick={() => deleteTicket(ticket)}
                        className="text-red-400 hover:text-red-300 transition-all p-2 hover:bg-red-500/20 rounded-lg hover:scale-110 active:scale-95"
                        title="Ticket'ı Sil"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Event Name - Large and Bold */}
                <div className="mb-4 relative z-10">
                  <h3 className="text-white font-black text-lg md:text-xl mb-2 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all duration-300">
                    {ticket.metadata.eventName}
                  </h3>
                  <div className="h-0.5 w-full bg-gradient-to-r from-white/40 via-white/20 to-transparent rounded-full"></div>
                </div>

                {/* Ticket Details */}
                <div className="space-y-3 mb-4 relative z-10">
                  {ticket.metadata.eventDate && (() => {
                    const calendarDate = getCalendarDate(ticket.metadata.eventDate);
                    return (
                      <div className="flex items-center gap-3 text-white/90">
                        {/* Calendar Card */}
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-400/40 flex flex-col items-center justify-center backdrop-blur-sm shadow-lg flex-shrink-0">
                          <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                            {calendarDate.month}
                          </p>
                          <p className="text-white text-2xl font-black leading-none">
                            {calendarDate.day}
                          </p>
                          <p className="text-white/70 text-[9px] font-medium mt-0.5">
                            {calendarDate.year}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-black font-bold text-xs mb-1">Etkinlik Tarihi</p>
                          <p className="font-bold text-sm text-white">{formatDate(ticket.metadata.eventDate)}</p>
                          <p className="text-white/60 text-xs mt-0.5">{calendarDate.dayName}</p>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {ticket.metadata.location && (
                    <div className="flex items-center gap-3 text-white/90">
                      <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20 flex-shrink-0">
                        <span className="text-lg">📍</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-black font-bold text-xs mb-0.5">Konum</p>
                        <p className="font-bold text-sm truncate text-white mt-1">{ticket.metadata.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {ticket.metadata.organizer && (
                    <div className="flex items-center gap-3 text-white/90">
                      <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20 flex-shrink-0">
                        <span className="text-lg">🏢</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-black font-bold text-xs mb-0.5">Organizatör</p>
                        <p className="font-bold text-sm truncate text-white mt-1">{ticket.metadata.organizer}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description if available */}
                {ticket.metadata.description && (
                  <div className="mb-4 pt-3 border-t border-white/20 relative z-10">
                    <p className="text-white/80 text-sm line-clamp-2 leading-relaxed">
                      {ticket.metadata.description}
                    </p>
                  </div>
                )}

                {/* Ticket Footer - Asset Info */}
                <div className="pt-3 border-t border-white/30 relative z-10">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-lg border border-white/30">
                        <p className="text-white/60 text-xs mb-0.5 font-medium">Miktar</p>
                        <p className="text-white font-black text-base">{ticket.balance}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-xs mb-1 font-medium">Asset Code</p>
                      <p className="text-white/90 font-mono text-xs bg-black/30 px-2 py-1 rounded border border-white/10">
                        {ticket.assetCode}
                      </p>
                    </div>
                  </div>
                  
                  {/* Comments Button */}
                  <button
                    onClick={() => openCommentsModal(ticket)}
                    className="w-full mt-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded-lg transition-all flex items-center justify-center gap-2 text-white text-sm font-semibold"
                  >
                    <FaComment className="text-sm" />
                    <span>Yorumlar</span>
                    {getCommentCount(ticket) > 0 && (
                      <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {getCommentCount(ticket)}
                      </span>
                    )}
                  </button>
                </div>

                {/* Decorative corner elements */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/5 to-transparent rounded-tr-full"></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {tickets.length > 0 && (
        <div className="mt-5 p-3 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 backdrop-blur-xl rounded-xl border border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-base">📊</span>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-0.5">Toplam Ticket</p>
                <p className="text-white font-black text-lg">{tickets.length}</p>
              </div>
            </div>
            {selectedFilter !== 'all' && (
              <div className="text-right">
                <p className="text-white/60 text-xs mb-0.5">Filtrelenmiş</p>
                <p className="text-white font-black text-lg">{filteredTickets.length}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>

    {/* Comments Modal */}
    {showCommentsModal && selectedTicket && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/20">
          <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{selectedTicket.metadata.eventName}</h3>
              <p className="text-white/60 text-sm">{nftTicketHelper.getTicketTypeInfo(selectedTicket.metadata.type).label}</p>
            </div>
            <button
              onClick={closeCommentsModal}
              className="text-white/60 hover:text-white text-2xl transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <FaTimes />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-4">
              {/* Comments List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <FaComment className="text-purple-400" />
                    Yorumlar ({comments.length})
                  </h4>
                </div>
                
                {comments.length === 0 ? (
                  <div className="text-center py-12">
                    <FaComment className="text-5xl text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 text-sm mb-1">Henüz yorum yok</p>
                    <p className="text-white/40 text-xs">İlk yorumu siz yapın ve deneyiminizi paylaşın!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center border border-purple-400/30">
                            <span className="text-sm text-white">👤</span>
                          </div>
                          <p className="text-white/90 text-sm font-semibold">{comment.author}</p>
                        </div>
                        <p className="text-white/40 text-xs">
                          {new Date(comment.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed pl-10">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <div className="pt-4 border-t border-white/20 mt-6">
                <label className="block text-white/80 text-sm mb-2 font-medium">Yorumunuz</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Bu etkinlik hakkında düşüncelerinizi paylaşın..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 resize-none text-sm"
                />
                <button
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="mt-3 w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaComment />
                  Yorum Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

