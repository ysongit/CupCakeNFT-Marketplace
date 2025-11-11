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

function useRecentlyListNFTs() {
  const { data, isLoading, error } = useQuery<NFTQueryResponse>({
    queryKey: ["rrecentNFTs"],
    queryFn: fetchNFTs
  })

// useMemo for cache this list of NFTs
const nftDataList = useMemo(() => {
  // If data hasn't loaded yet, or the nested structure is missing, return empty.
  // Optional chaining (?.) provides safety against runtime errors.
  if (!data) {
    return [];
  }

  // Create Sets for efficient O(1) average time complexity lookups.
  // Use unique identifiers combining address and token ID.
  const boughtNFTs = new Set<string>();
  data.data.allItemBoughts?.nodes.forEach((item) => {
    if (item.nftAddress && item.tokenId) {
      boughtNFTs.add(`${item.nftAddress}-${item.tokenId}`);
    }
  });

  const cancelledNFTs = new Set<string>();
  data.data.allItemCanceleds?.nodes.forEach((item) => {
    if (item.nftAddress && item.tokenId) {
      cancelledNFTs.add(`${item.nftAddress}-${item.tokenId}`);
    }
  });
  
  // Filter the listed NFTs. Keep only those NOT in the bought or cancelled sets.
  const activeNfts = data.data.allItemListeds.nodes.filter((item) => {
    if (!item.nftAddress || !item.tokenId) return false; // Skip incomplete items
      const key = `${item.nftAddress}-${item.tokenId}`;
      return !boughtNFTs.has(key) && !cancelledNFTs.has(key);
    });
  
    // Optional: Limit the number of results if needed
    const recentActiveNfts = activeNfts.slice(0, 100);

    // Map the filtered data to the structure expected by our UI component (e.g., NFTBox).
    // Ensure prop names match what the component expects (e.g., contractAddress vs nftAddress).
    return recentActiveNfts.map((nft) => ({
      tokenId: nft.tokenId,
      contractAddress: nft.nftAddress, // Mapping nftAddress to contractAddress prop
      price: nft.price,
      seller: nft.seller, // Include other needed props
    }));

    // The dependency array tells useMemo to recompute ONLY when 'data' changes.
  }, [data]);

  // Return the memoized list and the query states.
  return { isLoading, error, nftDataList };
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
                {nftDataList.map(nft => (
                  <Link
                    href={`/buy-nft/${nft.contractAddress}/${nft.tokenId}`}
                    key={`${nft.contractAddress}-${nft.tokenId}-link`}
                  >
                    <NFTBox
                      // React requires a unique key for each item in a list for efficient updates.
                      key={`${nft.contractAddress}-${nft.tokenId}`}
                      tokenId={nft.tokenId}
                      contractAddress={nft.contractAddress}
                      price={nft.price}
                      // Pass any other required props to NFTBox
                    />
                  </Link>
                ))}
            </div>
        </div>
    )
}