import { winstonLogger } from '@eoladapo/jobman-shared';
import { Logger } from 'winston';
import { config } from '@gateway/config';
import { Client } from '@elastic/elasticsearch';
import { ClusterHealthResponse } from '@elastic/elasticsearch/lib/api/types';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'apiGatewayElasticSearchConnection', 'debug');

// class ElasticSearch {
//   private elasticSearchClient: Client;

//   constructor() {
//     this.elasticSearchClient = new Client({
//       node: `${config.ELASTIC_SEARCH_URL}`
//     });
//   }

//   public async checkConnection(): Promise<void> {
//     let isConnected = false;
//     while (!isConnected) {
//       log.info('GatewayService Connecting to ElasticSearch');
//       try {
//         const health: ClusterHealthResponse = await this.elasticSearchClient.cluster.health({});
//         log.info(`GatewayService ElasticSearch health status - ${health.status}`);
//         isConnected = true;
//       } catch (error) {
//         log.error('Connection to ElasticSearch failed, Retrying...');
//         log.log('error', 'GatewayService checkConnection() method error:', error);
//       }
//     }
//   }
// }

// export const elasticSearch: ElasticSearch = new ElasticSearch();

 const elasticSearch = new Client({
  node: `${config.ELASTIC_SEARCH_URL}`
});

async function checkConnection(): Promise<void> {
  let isConnected = false;
  while (!isConnected) {
    log.info('AuthService connecting to ElasticSearch...');
    try {
      const health: ClusterHealthResponse = await elasticSearch.cluster.health({});
      log.info(`AuthService Elasticsearch health status - ${health.status}`);
      isConnected = true;
    } catch (error) {
      log.error('Connection to Elasticsearch failed. Retrying...');
      log.log('error', 'AuthService checkConnection() method:', error);
    }
  }
}

export { elasticSearch, checkConnection };
