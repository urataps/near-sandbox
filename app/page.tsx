"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { ethers } from "ethers";
import useInitNear from "@/hooks/useInitNear";
import { getRootPublicKey, signMPC } from "@/utils/contract/signer";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Ethereum, { SEPOLIA_CHAIN_ID } from "@/utils/chain/Ethereum";
import Button from "@/components/Button";
interface FormValues {
  chain: string;
  gasPrice: string;
  to: string;
  value: string;
}

export default function Home() {
  const { register, handleSubmit, watch } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPublicKey, setIsFetchingPublicKey] = useState(false);
  const [rootPublicKey, setRootPublicKey] = useState<string | undefined>(
    undefined
  );
  const { account, isLoading: isNearLoading } = useInitNear();
  const chain = watch("chain");

  const ethereum = new Ethereum({
    providerUrl: process.env.NEXT_PUBLIC_INFURA_URL,
    chainId: SEPOLIA_CHAIN_ID,
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      let transactionHash;
      switch (data.chain) {
        case "ETH":
          transactionHash = Ethereum.prepareTransactionForSignature(
            await ethereum.attachGasAndNonce({
              to: "0x4374678c78fEaFd778c10f319e5D226702449b25",
              value: ethers.utils.parseEther("0.11"),
            })
          );
          break;
        case "BTC":
        case "BNB":
          console.log(
            "Transaction preparation for BTC and BNB is not implemented yet."
          );
          break;
        default:
          console.error("Unsupported chain selected");
      }

      if (transactionHash && account) {
        const result = await signMPC(
          account,
          Array.from(ethers.utils.arrayify(transactionHash)),
          ",ethereum,near.org,"
        );

        if (result) {
          const path = Ethereum.recoverAddressFromSignature(
            transactionHash,
            result.r,
            result.s,
            result.v
          );

          console.log(path);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  const fetchPublicKey = async () => {
    if (!account) return;
    setIsFetchingPublicKey(true);
    try {
      const publicKey = await getRootPublicKey(account);
      if (publicKey) {
        console.log({ publicKey });
        setRootPublicKey(publicKey);
      } else {
        console.error("Failed to fetch root public key");
      }
    } catch (error) {
      console.error("Error fetching root public key:", error);
    } finally {
      setIsFetchingPublicKey(false);
    }
  };

  return (
    <div className="h-screen w-full flex justify-center items-center">
      {!account || isLoading || isNearLoading ? (
        <Loader />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Select
            {...register("chain")}
            placeholder="Select chain"
            className="mb-2"
            options={[
              { value: "ETH", label: "Ethereum" },
              { value: "BTC", label: "Bitcoin" },
              { value: "BNB", label: "Binance" },
            ]}
          />
          <Input {...register("to")} placeholder="To Address" />
          <Input {...register("value")} placeholder="Value" />
          <Button type="submit">Send Transaction</Button>
          <Button
            type="button"
            onClick={fetchPublicKey}
            isLoading={isFetchingPublicKey}
          >
            Fetch Public Key
          </Button>
        </form>
      )}
    </div>
  );
}
