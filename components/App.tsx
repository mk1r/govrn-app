import React from 'react'
import { ethers, BigNumber } from 'ethers'
import MolochArtifact from '../contracts/Moloch.json'
import WXDAIArtifact from '../contracts/WXDAI.json'
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import Header from './Header'
import Pledge from './Pledge'
import Status from './Status'
import Footer from './Footer'

interface IAppState {
  provider: any;
  web3Provider: any;
  connected: boolean;
  address: string;
  chainId: number;
  tokenBalance: number;
}

const INITIAL_STATE: IAppState = {
  provider: null,
  web3Provider: null,
  connected: false,
  address: '',
  chainId: 1,
  tokenBalance: 0
};

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      infuraId: "6eaaa7629e21410ea44bbda3388097fd"
    }
  }
};

class App extends React.Component<any, any> {
  // @ts-ignore
  public web3Modal: Web3Modal;
  public state: IAppState;
  public moloch: any;
  public amount: number;
  public shares: number;

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };

    this.moloch = null;
    this.amount = 0;
    this.shares = 0;

    if (typeof window !== 'undefined') {
      this.web3Modal = new Web3Modal({
        network: "mainnet",
        cacheProvider: true,
        providerOptions
      });
    }
  }

  public componentDidMount() {
    if (this.web3Modal.cachedProvider) {
      this.connectWallet();
    }
  }

  public async connectWallet() {
    const provider = await this.web3Modal.connect();
    await this.subscribeProvider(provider);
    const web3Provider: any = new ethers.providers.Web3Provider(provider);
    const address = await web3Provider.getSigner().getAddress();
    const { chainId } = await web3Provider.getNetwork();

    await this.setState({
      provider,
      web3Provider,
      connected: true,
      address,
      chainId
    });

    this.initContract();
  }

  public async subscribeProvider(provider: any) {
    if (!provider.on) {
      return;
    }
    provider.on("connect", (info: { chainId: string }) => {
      console.log(info);
    });
    provider.on("accountsChanged", async (accounts: string[]) => {
      const account = accounts[0];
      if (typeof account !== 'undefined') {
        await this.setState({ address: account });
        console.log(this.state.address);
      } else {
        this.web3Modal.clearCachedProvider();
        this.setState({ ...INITIAL_STATE });
      }
    });
    provider.on("chainChanged", async (chainId: string) => {
      await this.setState({ chainId: parseInt(chainId, 16) });
      console.log(this.state.chainId);
    });
    provider.on("disconnect", (error: { code: number; message: string }) => {
      console.log(error);
    });
  }

  private initContract() {
    if (!this.state.connected) {
      return;
    }

    this.moloch = new ethers.Contract(
      this.props.data.contract_id.toLowerCase(),
      MolochArtifact.abi,
      this.state.web3Provider.getSigner(0)
    );
  }

  public async donate() {
    if (this.moloch == null || this.amount === 0) {
      return;
    }

    const amountBN = ethers.utils.parseEther(this.amount.toString()); 
    const approved = await this.approve(amountBN);

    if (!approved) {
      return;
    }

    try {
      await this.moloch.submitProposal(
        this.state.address, 
        0,
        Math.floor(this.amount / 10),
        amountBN,
        '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
        0,
        '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d', 
        'Submit Proposal For OBD 4',
        {gasLimit: 1000000}
      );
    } catch (err) {
      console.log('Error: ', err);
    }
  }

  public async approve(abn: BigNumber) {
    if (this.state.chainId !== 100) {
      return false;
    }

    const wxdai = new ethers.Contract(
      '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
      WXDAIArtifact,
      this.state.web3Provider.getSigner(0)
    )

    const balance = await wxdai.balanceOf(this.state.address);
    console.log(ethers.utils.formatEther(balance));

    if (abn.gt(balance)) {
      return false;
    }
    
    const allowance = await wxdai.allowance(this.state.address, this.props.data.contract_id.toLowerCase());
    console.log(ethers.utils.formatEther(allowance));

    if (abn.gt(allowance)) {
      try {
        await wxdai.approve(this.props.data.contract_id.toLowerCase(), abn);
      } catch (err) {
        console.log('Error: ', err);
      }
    }

    return true;
  }

  public async withdraw() {
    if (this.moloch == null || this.shares === 0) {
      return;
    }

    const sharesBN = ethers.utils.parseEther(this.shares.toString());
    
    try {
      await this.moloch.rageQuit(sharesBN, 0);
    } catch (err) {
      console.log('Error: ', err);
    }
  }

  public setAmount(a: string) {
    const num = parseInt(a, 10);

    if (isNaN(num) || num <= 0) {
      this.amount = 0;
      return;
    }

    this.amount = num;
    console.log(this.amount);
  }

  public setShares(s: string) {
    const num = parseInt(s, 10);

    if (isNaN(num) || num <= 0) {
      this.shares = 0;
      return;
    }

    this.shares = num;
    console.log(this.shares);
  }
 
  render() {
    const { data, statusData, graphData } = this.props;
    const { connected, address } = this.state;
    const actions = {
      donate: () => this.donate(),
      withdraw: () => this.withdraw(),
      setAmount: (a: string) => this.setAmount(a),
      setShares: (s: string) => this.setShares(s)
    }
    const stateVars = {
      address,
      connected
    }
    return (
      <>
        <Header connect={() => this.connectWallet()} connected={connected} />
        <Pledge
          actions={actions}
          data={data}
          graphData={graphData}
          stateVars={stateVars} 
        />
        <Status statusData={statusData} obd_status={data.obd_status}/>
        <Footer />
      </>
    );
  }
}
export default App;
