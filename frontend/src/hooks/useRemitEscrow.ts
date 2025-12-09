import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { REMIT_ESCROW_ADDRESS, REMIT_ESCROW_ABI } from '../lib/contracts'
import type { Address } from 'viem'

// Read hooks
export function useGetRemittance(remittanceId: bigint | undefined) {
  return useReadContract({
    address: REMIT_ESCROW_ADDRESS,
    abi: REMIT_ESCROW_ABI,
    functionName: 'getRemittance',
    args: remittanceId !== undefined ? [remittanceId] : undefined,
    query: {
      enabled: remittanceId !== undefined
    }
  })
}

export function useGetUserRemittances(userAddress: Address | undefined) {
  return useReadContract({
    address: REMIT_ESCROW_ADDRESS,
    abi: REMIT_ESCROW_ABI,
    functionName: 'getUserRemittances',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress
    }
  })
}

export function useGetRecipientRemittances(recipientAddress: Address | undefined) {
  return useReadContract({
    address: REMIT_ESCROW_ADDRESS,
    abi: REMIT_ESCROW_ABI,
    functionName: 'getRecipientRemittances',
    args: recipientAddress ? [recipientAddress] : undefined,
    query: {
      enabled: !!recipientAddress
    }
  })
}

export function useGetContribution(remittanceId: bigint | undefined, contributor: Address | undefined) {
  return useReadContract({
    address: REMIT_ESCROW_ADDRESS,
    abi: REMIT_ESCROW_ABI,
    functionName: 'getContribution',
    args: remittanceId !== undefined && contributor ? [remittanceId, contributor] : undefined,
    query: {
      enabled: remittanceId !== undefined && !!contributor
    }
  })
}

export function useGetContributors(remittanceId: bigint | undefined) {
  return useReadContract({
    address: REMIT_ESCROW_ADDRESS,
    abi: REMIT_ESCROW_ABI,
    functionName: 'getContributors',
    args: remittanceId !== undefined ? [remittanceId] : undefined,
    query: {
      enabled: remittanceId !== undefined
    }
  })
}

export function useGetTotalRemittances() {
  return useReadContract({
    address: REMIT_ESCROW_ADDRESS,
    abi: REMIT_ESCROW_ABI,
    functionName: 'getTotalRemittances'
  })
}

export function useGetCurrentPrice() {
  return useReadContract({
    address: REMIT_ESCROW_ADDRESS,
    abi: REMIT_ESCROW_ABI,
    functionName: 'getCurrentPrice'
  })
}

export function usePlatformFeeBps() {
  return useReadContract({
    address: REMIT_ESCROW_ADDRESS,
    abi: REMIT_ESCROW_ABI,
    functionName: 'platformFeeBps'
  })
}

// Write hooks
export function useCreateRemittance() {
  const { writeContract, data: hash, ...rest } = useWriteContract()

  const createRemittance = (recipient: Address, targetAmount: bigint, purpose: string) => {
    writeContract({
      address: REMIT_ESCROW_ADDRESS,
      abi: REMIT_ESCROW_ABI,
      functionName: 'createRemittance',
      args: [recipient, targetAmount, purpose]
    })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash
  })

  return {
    createRemittance,
    hash,
    isConfirming,
    isConfirmed,
    ...rest
  }
}

export function useContribute() {
  const { writeContract, data: hash, ...rest } = useWriteContract()

  const contribute = (remittanceId: bigint, amount: bigint) => {
    writeContract({
      address: REMIT_ESCROW_ADDRESS,
      abi: REMIT_ESCROW_ABI,
      functionName: 'contribute',
      args: [remittanceId],
      value: amount
    })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash
  })

  return {
    contribute,
    hash,
    isConfirming,
    isConfirmed,
    ...rest
  }
}

export function useReleaseFunds() {
  const { writeContract, data: hash, ...rest } = useWriteContract()

  const releaseFunds = (remittanceId: bigint) => {
    writeContract({
      address: REMIT_ESCROW_ADDRESS,
      abi: REMIT_ESCROW_ABI,
      functionName: 'releaseFunds',
      args: [remittanceId]
    })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash
  })

  return {
    releaseFunds,
    hash,
    isConfirming,
    isConfirmed,
    ...rest
  }
}

export function useCancelRemittance() {
  const { writeContract, data: hash, ...rest } = useWriteContract()

  const cancelRemittance = (remittanceId: bigint) => {
    writeContract({
      address: REMIT_ESCROW_ADDRESS,
      abi: REMIT_ESCROW_ABI,
      functionName: 'cancelRemittance',
      args: [remittanceId]
    })
  }

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash
  })

  return {
    cancelRemittance,
    hash,
    isConfirming,
    isConfirmed,
    ...rest
  }
}
