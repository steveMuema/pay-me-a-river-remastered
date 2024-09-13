import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import CountUp from "react-countup";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

export type Stream = {
  sender: string;
  recipient: string;
  amountAptFloat: number;
  durationMilliseconds: number;
  startTimestampMilliseconds: number;
  streamId: number;
};

export default function CreatedStreamList(props: {
  isTxnInProgress: boolean;
  setTxn: (isTxnInProgress: boolean) => void;
}) {
  // Wallet state
  const { connected, account, signAndSubmitTransaction } = useWallet();
  // Toast state
  const { toast } = useToast();
  // Streams state
  const [streams, setStreams] = useState<Stream[]>([]);
  const [areStreamsLoading, setAreStreamsLoading] = useState(true);

  /* 
    Retrieve the streams from the module and set the streams state.
  */
  useEffect(() => {
    if (connected) {
      getSenderStreams().then((streams: Stream[] | undefined) => {
        setStreams(streams?? []);
        setAreStreamsLoading(false);
      });
    }
  }, [account, connected, props.isTxnInProgress]);

  /*
    Cancels a selected stream.
  */
  const cancelStream = async (recipient: string) => {
    /*
      Validate the account is defined before continuing. If not, return.
    */
    if (!account) {
      return;
    }
    /* 
      Set the isTxnInProgress state to true. This will display the loading spinner.
    */
    props.setTxn(true);
    /*
      Make a request to the entry function `cancel_stream` to cancel the stream. 
      
      HINT: 
        - In case of an error, set the isTxnInProgress state to false and return.
        - In case of success, display a toast notification with the transaction hash.
      -- Toast notification --
    */
      const transaction = {
        type: "entry_function_payload",
        function: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::cancel_stream`,
        type_arguments: [],
        arguments: [account.address, recipient],
      }
      let res;
      try{
        res = await signAndSubmitTransaction(transaction);
        } catch (error) {
          props.setTxn(false);
          console.log(error);
          return;
        }
      toast({
        title: "Stream closed!",
        description: `Closed stream for ${`${recipient.slice(
          0,
          6
        )}...${recipient.slice(-4)}`}`,
        action: (
          <a
            href={`https://explorer.aptoslabs.com/txn/${res.hash}`}
            target="_blank"
          >
            <ToastAction altText="View transaction">View txn</ToastAction>
          </a>
        ),
      });

    /*
      Set the isTxnInProgress state to false. This will hide the loading spinner.
    */
      props.setTxn(false);
  };

  /* 
    Retrieves the sender streams. 
  */
  const getSenderStreams = async () => {
    //  Validate the account is defined before continuing. If not, return.
     if (!account) {
      return [];
    }
      // Make a request to the view function `get_senders_streams` to retrieve the streams sent by the user.
    const body = {
      function:
        `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::get_senders_streams`,
      type_arguments: [],
      arguments: [account.address],
    };
    setAreStreamsLoading(true);
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
      Parse the response from the view request and create the streams array using the given 
            data. Return the new streams array.

      HINT:
      - Remember to convert the amount to floating point number
    */
    const data = await res.json();
    console.log(data);
    const results: Stream[] = [];
    const recipients = data[0];
    const startTimestamps = data[1].map( (duration: number)=> duration*1000);;
    const durationTimestamps = data[2].map( (duration: number)=> duration*1000);
    const streamAmounts = data[3].map( (amount: number)=> amount/1e8);;
    const streamIds = data[4];
    for(let i=0; i<streamIds.length; i++){
      if(startTimestamps.length === 0){
        setAreStreamsLoading(false);

        return results;
      } else{
        const recipient = recipients[i]; 
        const startTimestamp = startTimestamps[i];
        const durationMilliseconds = durationTimestamps[i];
        const streamAmount = parseFloat(streamAmounts[i]);
        const streamId = streamIds[i];
        let stream: Stream = {
          sender: account.address,
          recipient: recipient,
          amountAptFloat: streamAmount,
          durationMilliseconds: durationMilliseconds,
          startTimestampMilliseconds: startTimestamp,
          streamId: streamId
        }; 
        results.push(stream);
      }
    };
    setAreStreamsLoading(false);
    console.log(results);
    return results;
    } catch (e) {
      // setBalance("0");
      setAreStreamsLoading(false);
      console.log(e);
    }
  };

  return (
    <ScrollArea className="rounded-lg bg-neutral-400 border border-neutral-200 w-full">
      <div className="h-fit max-h-96 w-full">
        <Table className="w-full">
          <TableHeader className="bg-neutral-300">
            <TableRow className="uppercase text-xs font-matter hover:bg-neutral-300">
              <TableHead className="text-center">ID</TableHead>
              <TableHead className="text-center">Recipient</TableHead>
              <TableHead className="text-center">End date</TableHead>
              <TableHead className="text-center">Remaining amount</TableHead>
              <TableHead className="text-center">Cancel stream</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {
              /* 
                Add a skeleton loader when the streams are loading. Use the provided Skeleton component.

                HINT:
                  - Use the areStreamsLoading state to determine if the streams are loading.
                
                -- Skeleton loader -- 
              */
                areStreamsLoading && (
                <TableRow>
                  <TableCell className="items-center">
                    <div className="flex flex-row justify-center items-center w-full">
                      <Skeleton className="h-4 w-4" />
                    </div>
                  </TableCell>
                  <TableCell className="items-center">
                    <div className="flex flex-row justify-center items-center w-full">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="items-center">
                    <div className="flex flex-row justify-center items-center w-full">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="items-center">
                    <div className="flex flex-row justify-center items-center w-full">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="items-center">
                    <div className="flex flex-row justify-center items-center w-full">
                      <Skeleton className="h-8 w-12" />
                    </div>
                  </TableCell>
                </TableRow>
                )
            }
            {
              /* 
                Add a row to the table when there are no streams. Use the provided component to display the message.

                HINT:
                  - Use the areStreamsLoading state to determine if the streams are loading.
                  - Use the streams state to determine if there are any streams.

                -- message component --
              */
                !areStreamsLoading && streams.length === 0 && (
                <TableRow className="hover:bg-neutral-400">
                  <TableCell colSpan={5}>
                    <p className="break-normal text-center font-matter py-4 text-neutral-100">
                      You don&apos;t have any outgoing payments.
                    </p>
                  </TableCell>
                </TableRow>
                )
            }
            {
              /* 
                Add a row to the table for each stream in the streams array. Use the provided component to display the stream information.

                HINT:
                  - Use the areStreamsLoading state to determine if the streams are loading. Don't display
                    the streams if they are loading.
                  - Use the streams state to determine if there are any streams. 

                -- stream component --
              */
                streams.map((stream, index) => (
                  <TableRow key={index} className="font-matter hover:bg-neutral-400">
                    <TableCell className="text-center">{stream.streamId}</TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>{stream.recipient.slice(0,6)}...{stream.recipient.slice(-4)}</TooltipTrigger>
                          <TooltipContent>
                            <p>{stream.recipient}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      {stream.startTimestampMilliseconds > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {new Date(
                                stream.startTimestampMilliseconds +
                                  stream.durationMilliseconds
                              ).toLocaleDateString()}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {new Date(
                                  stream.startTimestampMilliseconds +
                                    stream.durationMilliseconds
                                ).toLocaleString()}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <p>
                          <i>Stream has not started</i>
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-center">
                      {stream.startTimestampMilliseconds > Date.now() ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {stream.amountAptFloat.toFixed(2)} APT
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{stream.amountAptFloat.toFixed(8)} APT</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : stream.startTimestampMilliseconds + stream.durationMilliseconds <
                        Date.now() ? (
                        <p>0.00 APT</p>
                      ) : (
                        <CountUp
                          start={stream.amountAptFloat}
                          end={0}
                          duration={stream.durationMilliseconds / 1000}
                          decimals={8}
                          decimal="."
                          suffix=" APT"
                          useEasing={false}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        className="bg-red-800 hover:bg-red-700 text-white"
                        onClick={() => cancelStream(stream.recipient)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              }
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
