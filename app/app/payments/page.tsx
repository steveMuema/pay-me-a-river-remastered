"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  LinkBreak2Icon,
} from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import ReceivedStream from "./ReceivedStream";
import CreatedStreamList, { Stream } from "./CreatedStreamList";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReceivedStreamSkeleton from "./ReceivedStreamSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarLoader } from "react-spinners";
import { NoWalletConnected } from "@/components/NoWalletConnected";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import StreamCreator from "./StreamCreator";

enum Sort {
  MostRecent = "Most Recent",
  Oldest = "Oldest",
  EndDateCloseToFar = "End Date - Close to Far",
  EndDateFarToClose = "End Date - Far to Close",
  TotalAmountLowToHigh = "Total Amount - Low to High",
  TotalAmountHightToLow = "Total Amount - High to Low",
  ClaimableAmountHighToClose = "Claimable Amount - High to Low",
  ClaimableAmountCloseToHigh = "Claimable Amount - Low to High",
}
function stringToSortEnum(value: string): Sort | null {
  if (Object.values(Sort).indexOf(value as Sort) >= 0) {
    return value as Sort;
  }
  return null;
}

enum Status {
  Active = "Active",
  Completed = "Completed",
}
function stringToStatusEnum(value: string): Status | null {
  if (Object.values(Status).indexOf(value as Status) >= 0) {
    return value as Status;
  }
  return null;
}

export default function ClaimerPage() {
  // Wallet state
  const { isLoading, connected, account, network } = useWallet();
  // receiver streams state
  const [streams, setStreams] = useState<{
    Completed: Stream[];
    Active: Stream[];
  }>({ Completed: [], Active: [] });

  // loading states
  const [txnInProgress, setTxnInProgress] = useState(false);
  const [areStreamsLoading, setAreStreamsLoading] = useState(true);

  // dropdown states
  const [sort, setSort] = useState(Sort.MostRecent);
  const [status, setStatus] = useState(Status.Active);

  // button disabled states
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);

  /* 
    Disables the create payment button if a transaction is in progress.
  */
  useEffect(() => {
    if (txnInProgress) setIsCreatePaymentOpen(false);
  }, [isCreatePaymentOpen, txnInProgress]);

  /* 
    Fetches the receiver streams when the wallet is connected.
  */
  useEffect(() => {
    if (connected && !txnInProgress) {
      getReceiverStreams().then((results: any) => {
        setStreams({
          Active: [...results.Pending, ...results.Active],
          Completed: results.Completed,
        });
        setAreStreamsLoading(false);
      });
    }
  }, [account, connected, txnInProgress]);

  /* 
    Retrieves the receiver streams. 
  */
  const getReceiverStreams = async () => {
    /*
      Validate the account is defined before continuing. If not, return.
    */
    if (!account) {
      return [];
    }
    /* 
      Set the areStreamsLoading state variable to true
    */
    setAreStreamsLoading(true);
    /*
      Make a request to the view function `get_receivers_streams` to retrieve the streams sent by the user.
    */
    const body = {
      function:
      `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::get_receivers_streams`,
      type_arguments: [],
      arguments: [account.address],
    };
  
    let res;
    try {
      res = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/view`,
        {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      )
    /* 
      TODO #8: Parse the response from the view request and create an object containing an array of 
            pending, completed, and active streams using the given data. Return the new object.

      HINT:
        - Remember to convert the amount to floating point number
        - Remember to convert the timestamps to milliseconds
        - Mark a stream as pending if the start timestamp is 0
        - Mark a stream as completed if the start timestamp + duration is less than the current time
        - Mark a stream as active if it is not pending or completed
    */
    const data = await res.json();
    const senderAddresses = data[0]
    const startTimestamps = data[1].map((timestamp: number) => timestamp*1000);
    const durationTimestamps = data[2].map( (duration: number)=> duration*1000);
    const streamAmounts = data[3].map( (amount: number)=> amount/1e8);;
    const streamIds = data[4];
    const streams:{
      Pending: Stream[];
      Completed: Stream[];
      Active: Stream[];
    } = {
      Pending: [],
      Completed: [], 
      Active: [],
    };
    for(let i=0; i <= startTimestamps.length; i++){
      if(senderAddresses.length === 0){
        return streams;
      } else{
      const senderAddress = senderAddresses[i]
      const startTimestamp = startTimestamps[i];
      const durationMilliseconds = durationTimestamps[i];
      const endTimestamp = startTimestamp + durationMilliseconds;
      const streamAmount = streamAmounts[i];
      const streamId = streamIds[i];
      let stream: Stream = {
        sender: senderAddress,
        recipient: account.address,
        amountAptFloat: streamAmount,
        startTimestampMilliseconds: startTimestamp,
        durationMilliseconds: durationMilliseconds,
        streamId: streamId,
      };

      if (startTimestamp === 0) {
        streams.Pending.push(stream);
      } else if (endTimestamp < Date.now()) {
        streams.Completed.push(stream);
      } else {
        streams.Active.push(stream);
      }
      } 
      console.log(streams);
      return streams;
    }
    }catch (error) {
      console.error(error);
      return streams;
    }
     
  };
  /* 
    displays a message if the wallet is not connected
  */
  if (!connected) {
    return <NoWalletConnected />;
  }

  return (
    <>
      {
        /* 
          Display a loading indicator if a transaction is in progress. Use the given component to display the loading indicator.

          HINT:
            - Use the `txnInProgress` variable to check if a transaction is in progress.

          -- BarLoader component --
        */
          txnInProgress && (
            <div className="bg-neutral-900/50 backdrop-blur absolute top-0 bottom-0 left-0 right-0 z-50 m-auto flex items-center justify-center">
              <div className="p-6 flex flex-col items-center justify-center space-y-4">
                <BarLoader color="#10B981" />
                <p className="text-lg font-medium">Processing Transaction</p>
              </div>
            </div>
          )
      }

      <>
        {
          /* 
            Display an error message if the wallet is connected to the wrong network. Use the 
                  given components to display the message.
            
            HINT:
              - Use the `connected` variable to check if the wallet is connected.
              - Use the `isLoading` variable to check if the wallet is loading. Don't display the error
                message if the wallet is still loading.
              - Use the `network` variable to check if the wallet is connected to the Testnet.

            -- Alert Component --
          */
            !isLoading && connected && network && network.name.toString() !== "Testnet" && (
              <Alert variant="destructive" className="w-fit mb-2 mr-2">
                <LinkBreak2Icon className="h-4 w-4" />
                <AlertTitle>Switch your network!</AlertTitle>
                <AlertDescription>
                  You need to switch your network to Testnet before you can use this app.
                </AlertDescription>
              </Alert>
            )
        }

        {!isLoading &&
          connected &&
          network &&
          network.name.toString() == "Testnet" && (
            <div className="w-full flex items-center justify-center py-5 px-6">
              <div className="flex flex-col items-start justify-start grow gap-4 w-full max-w-6xl">
                <div className="flex flex-col space-y-3 border-b border-neutral-300 w-full pb-5">
                  <div className="flex flex-row items-end justify-between w-full">
                    <p className="text-4xl font-bold font-cal">
                      Outgoing Payments
                    </p>

                    <Dialog
                      open={isCreatePaymentOpen}
                      onOpenChange={setIsCreatePaymentOpen}
                    >
                      <DialogTrigger>
                        <Button className="bg-green-800 text-white font-matter px-3 hover:bg-green-700">
                          Create Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <StreamCreator
                          setTxn={setTxnInProgress}
                          isTxnInProgress={txnInProgress}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="w-full">
                  <CreatedStreamList
                    setTxn={setTxnInProgress}
                    isTxnInProgress={txnInProgress}
                  />
                </div>

                <div className="flex flex-col space-y-3 border-b border-neutral-300 w-full pb-5">
                  <div className="flex flex-row items-end justify-between w-full">
                    <p className="text-4xl font-bold font-cal">
                      Incoming Payments
                    </p>

                    <div className="flex flex-row gap-3 items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-neutral-300 text-white hover:bg-neutral-200">
                            {status} streams{" "}
                            <ChevronDownIcon className="ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Stream status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup
                            value={status}
                            onValueChange={(value) => {
                              setStatus(
                                stringToStatusEnum(value) || Status.Active
                              );
                            }}
                          >
                            <DropdownMenuRadioItem value={Status.Active}>
                              {Status.Active} streams - {streams.Active.length}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value={Status.Completed}>
                              {Status.Completed} streams -{" "}
                              {streams.Completed.length}
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="bg-neutral-300 text-white hover:bg-neutral-200">
                            {sort} <ChevronDownIcon className="ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Sorting methods</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup
                            value={sort}
                            onValueChange={(value) => {
                              setSort(
                                stringToSortEnum(value) || Sort.MostRecent
                              );
                            }}
                          >
                            <DropdownMenuRadioItem value={Sort.MostRecent}>
                              {Sort.MostRecent}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value={Sort.Oldest}>
                              {Sort.Oldest}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.ClaimableAmountHighToClose}
                            >
                              {Sort.ClaimableAmountHighToClose}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.ClaimableAmountCloseToHigh}
                            >
                              {Sort.ClaimableAmountCloseToHigh}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.TotalAmountHightToLow}
                            >
                              {Sort.TotalAmountHightToLow}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.TotalAmountLowToHigh}
                            >
                              {Sort.TotalAmountLowToHigh}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.EndDateFarToClose}
                            >
                              {Sort.EndDateFarToClose}
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem
                              value={Sort.EndDateCloseToFar}
                            >
                              {Sort.EndDateCloseToFar}
                            </DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                <div className="w-full flex flex-col items-center gap-4">
                  {(isLoading || areStreamsLoading) && (
                    <div className="grid grid-cols-1 gap-5 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                      <ReceivedStreamSkeleton />
                    </div>
                  )}

                  {
                    /* 
                       Display a message if there are no incoming payments of the selected status. 
                            Use the given components to display the message.

                      HINT:
                        - Use the `streams` variable to check if there are any streams of the selected status.
                        - Use the `isLoading` variable to check if the wallet is loading. Don't display the message
                          if the wallet is still loading.
                        - Use the `areStreamsLoading` variable to check if the streams are loading. Don't display the message
                          if the streams are still loading.

                      -- Message component --
                    */
                      !isLoading && !areStreamsLoading && streams[status].length === 0 && (
                        <div className="flex flex-col space-y-1 items-center justify-center w-full bg-neutral-400 border border-neutral-300 py-12 px-6 font-matter rounded-lg">
                          <p className="text-2xl font-medium">No Incoming Payments</p>
                          <p className="text-neutral-100 text-lg">
                            You do not have any {status.toLowerCase()} payments.
                          </p>
                        </div>
                      )
                  }

                  {
                      // Display the incoming payments of the selected status. Use the given components to display the streams. 
                      //         Sort the streams based on the selected sorting method.

                      // HINT:
                      //   - Use the `streams` variable to get the streams of the selected status.
                      //   - Use the `isLoading` variable to check if the wallet is loading. Don't display the streams
                      //     if the wallet is still loading.
                      //   - Use the `areStreamsLoading` variable to check if the streams are loading. Don't display the streams
                      //     if the streams are still loading.

                      // -- ReceivedStream component --
                      !isLoading && !areStreamsLoading && (
                      <div className="grid grid-cols-1 gap-5 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full">
                        {streams[status]
                          .map((stream) => {
                            return (
                              <ReceivedStream
                                key={stream.streamId}
                                isTxnInProgress={txnInProgress}
                                setTxn={setTxnInProgress}
                                senderAddress={stream.sender}
                                amountAptFloat={stream.amountAptFloat}
                                durationSeconds={
                                  stream.durationMilliseconds / 1000
                                }
                                startTimestampSeconds={
                                  stream.startTimestampMilliseconds / 1000
                                }
                                streamId={stream.streamId}
                              />
                            );
                          })
                          .sort((a: any, b: any) => {
                            switch (sort) {
                              case Sort.MostRecent:
                                return b.streamId - a.streamId;
                              case Sort.Oldest:
                                return a.streamId - b.streamId;
                              case Sort.TotalAmountHightToLow:
                                return b.streamAmount - a.streamAmount;
                              case Sort.TotalAmountLowToHigh:
                                return a.streamAmount - b.streamAmount;
                              case Sort.EndDateFarToClose:
                                return a.startTimestamp + a.durationMilliseconds - (b.startTimestamp + b.durationMilliseconds);
                              case Sort.EndDateCloseToFar:
                                return b.startTimestamp + b.durationMilliseconds - (a.startTimestamp + a.durationMilliseconds);
                              case Sort.ClaimableAmountHighToClose:
                                // Adjust the logic based on your requirements
                                return b.streamAmount - a.streamAmount;
                              case Sort.ClaimableAmountCloseToHigh:
                                // Adjust the logic based on your requirements
                                return a.streamAmount - b.streamAmount;
                              default:
                                return b.streamId - a.streamId;
                            }
                          })}
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          )}
      </>
    </>
  );
}
