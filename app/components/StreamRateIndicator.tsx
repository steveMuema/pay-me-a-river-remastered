import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Stream } from "@/app/payments/CreatedStreamList";

/* 
  Finds the best unit to display the stream rate in by changing the bottom of the unit from seconds
  to minutes, hours, days, etc.
*/
function displayStreamRate(streamRatePerSecond: number) {
  if (streamRatePerSecond == 0) {
    return "0 APT / s";
  }

  if (Math.abs(streamRatePerSecond) >= 1) {
    return `${streamRatePerSecond.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} APT / s`;
  }

  streamRatePerSecond *= 60; // to minutes
  if (Math.abs(streamRatePerSecond) >= 1) {
    return `${streamRatePerSecond.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} APT / min`;
  }

  streamRatePerSecond *= 60; // to hours
  if (Math.abs(streamRatePerSecond) >= 1) {
    return `${streamRatePerSecond.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} APT / hr`;
  }

  streamRatePerSecond *= 24; // to days
  if (Math.abs(streamRatePerSecond) >= 1) {
    return `${streamRatePerSecond.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} APT / day`;
  }

  streamRatePerSecond *= 7; // to weeks
  if (Math.abs(streamRatePerSecond) >= 1) {
    return `${streamRatePerSecond.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} APT / week`;
  }

  streamRatePerSecond *= 4; // to months
  if (Math.abs(streamRatePerSecond) >= 1) {
    return `${streamRatePerSecond.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })} APT / month`;
  }

  streamRatePerSecond *= 12; // to years

  return `${streamRatePerSecond.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })} APT / year`;
}

export default function StreamRateIndicator() {
  // wallet adapter state
  const { isLoading, account, connected } = useWallet();
  // stream rate state
  const [streamRate, setStreamRate] = useState(0);

  /* 
    Calculates and sets the stream rate
  */
  useEffect(() => {
    calculateStreamRate().then((streamRate) => {
      setStreamRate(streamRate);
    });
  });

  /*
    Calculates the stream rate by adding up all of the streams the user is receiving and subtracting
    all of the streams the user is sending.
  */
  const calculateStreamRate = async () => {
    if (!account) {
      return 0;
    }
    const senderStreams: any = await getSenderStreams();
    const receiverStreams: any = await getReceiverStreams();
    let aptPerSec = 0;
    for (const stream of receiverStreams.active) {
      aptPerSec += stream.streamAmount / (stream.durationMilliseconds / 1000);
    }

    for (const stream of senderStreams) {
      aptPerSec -= stream.streamAmount / (stream.durationMilliseconds / 1000);
    }
    return aptPerSec;
  };



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
    const streams: { startTimestamp: any; durationMilliseconds: any; streamAmount: number; }[] = [];
    const startTimestamps = data[1];
    const durationTimestamps = data[2].map( (duration: number)=> duration*1000);
    const streamAmounts = data[3];
    for(let i=0; 1<=data.length; i++){
      if(startTimestamps.length === 0){
        return streams;
      } else{
        const startTimestamp = startTimestamps[i];
        const durationMilliseconds = durationTimestamps[i];
        const streamAmount = streamAmounts[i]/1e8;
        streams.push({startTimestamp, durationMilliseconds, streamAmount});
      }
      return streams;
    };
    } catch (e) {
      console.log(e);
    }
    
  };

  const getReceiverStreams = async () => {
    // Validate the account is defined before continuing. If not, return.
    if (!account) {
      return [];
    }
    // Make a request to the view function `get_receivers_streams` to retrieve the streams sent by the user.
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
      Parse the response from the view request and create an object containing an array of 
      pending, completed, and active streams using the given data. Return the new object.

      HINT:
        - Remember to convert the amount to floating point number
        - Remember to convert the timestamps to milliseconds
        - Mark a stream as pending if the start timestamp is 0
        - Mark a stream as completed if the start timestamp + duration is less than the current time
        - Mark a stream as active if it is not pending or completed
    */
    
    const data = await res.json();
    const streams: {
      pending: any,
      completed: any,
      active: any,
    } = {
      pending: [],
      completed: [],
      active: [],
    };
    const startTimestamps = data[1].map((timestamp: number)=> timestamp*1000);
    const durationTimestamps = data[2].map( (duration: number)=> duration*1000);
    const streamAmounts = data[3];
    // const streamIds = data[4];
    for(let i = 0; i <= data.length; i++){
      // const sender = senders[i];
      const startTimestamp = startTimestamps[i] || 0;
      const durationMilliseconds = durationTimestamps[i];
      const endTimestamp = parseInt(startTimestamp) + durationMilliseconds;
      const streamAmount = parseFloat(streamAmounts[i])/1e8;
      if (startTimestamp === 0) {
        streams.pending.push({ startTimestamp, durationMilliseconds, streamAmount });
      } else if (endTimestamp < Date.now()) {
        streams.completed.push({ startTimestamp, durationMilliseconds, streamAmount });
      } else {
        streams.active.push({ startTimestamp, durationMilliseconds, streamAmount });
      }
    };

    return streams;
    } catch (error) {
    console.error(error);
    return { pending: [], completed: [], active: [] };
    }
  };

  if (!connected) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-neutral-500 hover:bg-neutral-500 px-3">
          <div className="flex flex-row gap-3 items-center">
            <InfoCircledIcon className="h-4 w-4 text-neutral-100" />

            <span
              className={
                "font-matter " +
                (streamRate > 0
                  ? "text-green-400"
                  : streamRate < 0
                  ? "text-red-400"
                  : "")
              }
            >
              {isLoading || !connected ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                displayStreamRate(streamRate)
              )}
            </span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your current stream rate</DialogTitle>
          <DialogDescription>
            This is the current rate at which you are streaming and being
            streamed APT. This rate is calculated by adding up all of the
            streams you are receiving and subtracting all of the streams you are
            sending.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
