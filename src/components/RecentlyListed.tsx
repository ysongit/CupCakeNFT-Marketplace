import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import NFTBox from "./NFTBox"
import Link from "next/link"

interface NFTItem {
    rindexerId: string;
    seller: string;
    nftAddress: string;
    price: string;
    tokenId: string;
    contractAddress: string;
    txHash: string;
    blockNumber: string;
}

interface BoughtCancelled {
    nftAddress: string;
    tokenId: string;
}

interface NFTQueryResponse {
    data: {
        allItemListeds: {
            nodes: NFTItem[]
        },
        allItemBoughts: {
            nodes: NFTItem[]
        },
        allItemCanceleds: {
            nodes: NFTItem[]
        }
    }
}

const GET_RECENT_NFTS = `
  query GetMarketplaceData {
    # Fetch the latest 20 listed items, newest first
    allItemListeds(first: 20, orderBy: [BLOCK_NUMBER_DESC, TX_INDEX_DESC]) {
      nodes {
        rindexerId      # Unique ID from rindexer
        seller
        nftAddress
        price
        tokenId
        contractAddress # Smart contract emitting the event
        txHash
        blockNumber
      }
    }
    # Fetch all cancellation events (for filtering)
    allItemCanceleds { # Matches the event name indexed by rindexer
      nodes {
        nftAddress
        tokenId
      }
    }
    # Fetch all purchase events (for filtering)
    allItemBoughts { # Matches the event name indexed by rindexer
      nodes {
        tokenId
        nftAddress
      }
    }
  }
`;

async function fetchNFTs() { // We'll add type safety next
  const response = await fetch('/api/graphql', { // Target the proxied endpoint
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // Essential for GraphQL
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: GET_RECENT_NFTS, // Pass our defined GraphQL query string
      // variables: {} // Add if your query uses GraphQL variables
    }),
  });

  if (!response.ok) {
    // Handle HTTP errors (e.g., network issues, server errors)
    console.error("HTTP Error:", response.status, response.statusText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const jsonResponse = await response.json();

  if (jsonResponse.errors) {
      // Handle GraphQL errors (e.g., syntax errors in the query)
      console.error("GraphQL Errors:", jsonResponse.errors);
      throw new Error(`GraphQL error: ${jsonResponse.errors.map((e: any) => e.message).join(', ')}`);
  }
  
  return jsonResponse; // Return the parsed JSON data (contains a 'data' key)
}

// Main component that uses the custom hook
export default function RecentlyListedNFTs() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mt-8 text-center">
                <Link
                    href="/list-nft"
                    className="inline-block py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    List Your NFT
                </Link>
            </div>
            <h2 className="text-2xl font-bold mb-6">Recently Listed NFTs</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <img
                    src="/placeholder.png"
                    alt={`NFT`}
                    className="w-full h-auto max-h-96 object-contain bg-zinc-50"
                    onError={() => {
                        console.error("Error loading NFT image")
                    }}
                />
            </div>
        </div>
    )
}