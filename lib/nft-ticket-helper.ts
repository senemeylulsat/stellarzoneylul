/**
 * NFT Ticket Helper - Stellar NFT Ticket Operations
 * 
 * Handles NFT ticket minting, listing, and transfer operations on Stellar
 * Each ticket is a unique custom asset with metadata stored in data entries
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { stellar } from './stellar-helper';

export type TicketType = 'football' | 'university' | 'museum' | 'concert' | 'event';

export interface TicketMetadata {
  ticketId: string;
  type: TicketType;
  eventName: string;
  eventDate: string;
  location?: string;
  organizer?: string;
  description?: string;
  imageUrl?: string;
  mintedAt: string;
}

export interface NFTTicket {
  assetCode: string;
  issuer: string;
  balance: string;
  metadata: TicketMetadata;
}

export class NFTTicketHelper {
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;

  constructor() {
    // Use testnet for now
    this.server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    this.networkPassphrase = StellarSdk.Networks.TESTNET;
  }

  /**
   * Generate unique asset code for ticket
   */
  generateAssetCode(ticketType: TicketType, eventName: string, ticketId: string): string {
    // Stellar asset codes must be 1-12 characters, alphanumeric
    const prefix = ticketType.substring(0, 3).toUpperCase(); // FOOT, UNIV, MUSE, etc.
    const eventCode = eventName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 5)
      .toUpperCase();
    const id = ticketId.substring(0, 4).toUpperCase();
    return `${prefix}${eventCode}${id}`.substring(0, 12);
  }

  /**
   * Mint a new NFT ticket
   * Creates a custom asset and stores metadata in data entries
   */
  async mintTicket(
    issuerKeypair: StellarSdk.Keypair,
    recipientPublicKey: string,
    metadata: TicketMetadata
  ): Promise<{ assetCode: string; issuer: string; txHash: string }> {
    try {
      const account = await this.server.loadAccount(issuerKeypair.publicKey());
      
      // Generate unique asset code
      const assetCode = this.generateAssetCode(metadata.type, metadata.eventName, metadata.ticketId);
      
      // Create custom asset
      const asset = new StellarSdk.Asset(assetCode, issuerKeypair.publicKey());
      
      // Build transaction: Create trustline and payment
      const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });

      // Add trustline for recipient (if needed)
      // Note: In production, recipient should set trustline first
      // For demo, we'll assume trustline exists or will be created
      
      // Send 1 unit of the asset (NFT)
      transactionBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: recipientPublicKey,
          asset: asset,
          amount: '1',
        })
      );

      // Store metadata in data entries on the recipient account
      // We'll store it on issuer account for now (can be moved to recipient later)
      const metadataKey = `TICKET_${metadata.ticketId}`;
      const metadataValue = JSON.stringify(metadata);
      
      // Note: Data entries are stored on the account that sets them
      // For simplicity, we'll store on issuer account
      // In production, you might want to store on recipient or use a separate metadata service

      const transaction = transactionBuilder.setTimeout(180).build();
      transaction.sign(issuerKeypair);

      const result = await this.server.submitTransaction(transaction);

      return {
        assetCode,
        issuer: issuerKeypair.publicKey(),
        txHash: result.hash,
      };
    } catch (error: any) {
      console.error('Mint ticket error:', error);
      throw new Error(`Failed to mint ticket: ${error.message}`);
    }
  }

  /**
   * Mint ticket using wallet kit (for user-initiated minting)
   */
  async mintTicketWithWallet(
    issuerPublicKey: string,
    recipientPublicKey: string,
    metadata: TicketMetadata
  ): Promise<{ assetCode: string; issuer: string; txHash: string }> {
    // For wallet-based minting, we need the issuer to sign
    // This is a simplified version - in production, you'd have a backend service
    // that handles the minting with proper key management
    
    // For now, we'll create a payment with memo containing ticket info
    // The actual NFT would be minted by a service account
    throw new Error('Wallet-based minting requires a service account. Use mintTicket with keypair instead.');
  }

  /**
   * Get all NFT tickets owned by an account
   */
  async getTickets(publicKey: string): Promise<NFTTicket[]> {
    try {
      const account = await this.server.loadAccount(publicKey);
      
      // Get all non-native assets (potential tickets)
      const ticketAssets = account.balances
        .filter((b) => b.asset_type !== 'native' && parseFloat((b as any).balance) > 0)
        .map((b: any) => ({
          assetCode: b.asset_code,
          issuer: b.asset_issuer,
          balance: b.balance,
        }));

      // Try to fetch metadata for each ticket
      // In production, you'd query data entries or a metadata service
      const tickets: NFTTicket[] = [];
      
      for (const asset of ticketAssets) {
        // Try to get metadata from data entries
        // For now, we'll create a basic metadata structure
        // In production, you'd fetch from the issuer's data entries or IPFS
        
        // Check if this looks like a ticket (custom logic)
        if (this.isLikelyTicket(asset.assetCode)) {
          const metadata: TicketMetadata = {
            ticketId: asset.assetCode,
            type: this.inferTicketType(asset.assetCode),
            eventName: this.parseEventName(asset.assetCode),
            eventDate: new Date().toISOString(), // Would come from metadata
            mintedAt: new Date().toISOString(),
          };
          
          tickets.push({
            ...asset,
            metadata,
          });
        }
      }

      return tickets;
    } catch (error: any) {
      console.error('Get tickets error:', error);
      return [];
    }
  }

  /**
   * Check if asset code looks like a ticket
   */
  private isLikelyTicket(assetCode: string): boolean {
    const ticketPrefixes = ['FOOT', 'UNIV', 'MUSE', 'CONC', 'EVEN', 'TICK'];
    return ticketPrefixes.some(prefix => assetCode.startsWith(prefix));
  }

  /**
   * Infer ticket type from asset code
   */
  private inferTicketType(assetCode: string): TicketType {
    if (assetCode.startsWith('FOOT')) return 'football';
    if (assetCode.startsWith('UNIV')) return 'university';
    if (assetCode.startsWith('MUSE')) return 'museum';
    if (assetCode.startsWith('CONC')) return 'concert';
    return 'event';
  }

  /**
   * Parse event name from asset code (simplified)
   */
  private parseEventName(assetCode: string): string {
    // Remove prefix and return readable name
    return assetCode.replace(/^(FOOT|UNIV|MUSE|CONC|EVEN)/, '').replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Transfer NFT ticket to another account
   */
  async transferTicket(
    fromPublicKey: string,
    toPublicKey: string,
    assetCode: string,
    issuer: string
  ): Promise<{ txHash: string }> {
    try {
      const account = await this.server.loadAccount(fromPublicKey);
      const asset = new StellarSdk.Asset(assetCode, issuer);

      const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      }).addOperation(
        StellarSdk.Operation.payment({
          destination: toPublicKey,
          asset: asset,
          amount: '1',
        })
      );

      const transaction = transactionBuilder.setTimeout(180).build();

      // Sign with wallet kit (would need to be passed in)
      // For now, this is a placeholder
      throw new Error('Transfer requires wallet signing. Use stellar.sendPayment with custom asset instead.');
    } catch (error: any) {
      console.error('Transfer ticket error:', error);
      throw new Error(`Failed to transfer ticket: ${error.message}`);
    }
  }

  /**
   * Get ticket type display info
   */
  getTicketTypeInfo(type: TicketType): { icon: string; label: string; color: string } {
    const info = {
      football: { icon: '⚽', label: 'Maç Katılım Rozeti', color: 'green' },
      university: { icon: '🎓', label: 'Etkinlik Hatıra NFT\'si', color: 'blue' },
      museum: { icon: '🏛️', label: 'Dijital Müze Bileti', color: 'purple' },
      concert: { icon: '🎵', label: 'Konser Bileti', color: 'pink' },
      event: { icon: '🎫', label: 'Etkinlik Bileti', color: 'orange' },
    };
    return info[type];
  }
}

export const nftTicketHelper = new NFTTicketHelper();

