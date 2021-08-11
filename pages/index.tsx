import Head from 'next/head'
import App from '../components/App'
import Airtable from 'airtable'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

const Index: React.FC<any> = ({ data, statusData, graphData }) => {
  return (
    <>
      <Head>
        <title>Govrn</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <meta httpEquiv="Content-Security-Policy" content="connect-src ws: wss: https: http:" />
      </Head>
      <App data={data} statusData={statusData} graphData={graphData} />
    </>
  );
}

async function getOBDs(base: any) {
  if(base == null) {
    return;
  }

  const table = base('OBDs'); 
  const records = await table.select({}).firstPage();
  const record = records[0];

  const data = {
    name: record.get('Name'),
    slug: record.get('slug'),
    obd_status: record.get('obd_status'),
    topic_badge: record.get('topic_badge'),
    display_name: record.get('display_name'),
    community_badge: record.get('community_badge'),
    description: record.get('description')
  };

  return data;
}

async function getStatus(base: any) {
  if(base == null) {
    return;
  }

  const table = base('Status'); 
  const records = await table.select({}).firstPage();
  const record = records[0];

  const data = {
    name: record.get('Name'),
    display_description: record.get('display_description'),
    display_title: record.get('display_title')
  }

  return data;
}

async function getGraphData(client: any) {
  if(client == null) {
    return;
  }

  const contractQuery =
    `query {
      moloches(where: {id: "0x55cd67ec877ef72318b56df59a4c287c0a7925d3"}) {
        totalLoot
        members
      }
      members (where: {id: "0x55cd67ec877ef72318b56df59a4c287c0a7925d3-member-0xf3cd37071a7c1e69e0036d077982d12794f85742"}) {
		    shares
        loot
      }
    }`;

  const { data } = await client.query({
    query: gql(contractQuery)
  });

  const totalDonated = data['moloches'][0]['totalLoot'];
  const totalDonors = data['moloches'][0]['members'].length;

  /*console.log(totalDonated);
  console.log(totalDonors);
  console.log(data);
  console.log(data['members'][0]['loot']);
  console.log(data['members'][0]['shares']);*/
  
  return data;
}

export async function getServerSideProps() {
  const base = new Airtable({apiKey: 'keyaudliIldliyUJz'}).base('appDlPdTF1Nd833iw');
  const data = await getOBDs(base);
  const statusData = await getStatus(base);

  const client = new ApolloClient({
    uri: "https://api.thegraph.com/subgraphs/name/odyssy-automaton/daohaus-xdai",
    cache: new InMemoryCache()
  });
  const graphData = await getGraphData(client);

  return {
    props: {
      data,
      statusData,
      graphData
    }
  }
}

export default Index;
