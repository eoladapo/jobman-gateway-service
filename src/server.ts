import { CustomError, IErrorResponse, winstonLogger } from '@eoladapo/jobman-shared';
import { Logger } from 'winston';
import { config } from '@gateway/config';
import cors from 'cors';
import hpp from 'hpp';
import helmet from 'helmet';
import http from 'http';
import compression from 'compression';
import cookieSession from 'cookie-session';
import { Application, NextFunction, Request, Response, json, urlencoded } from 'express';
import { StatusCodes } from 'http-status-codes';
import { elasticSearch } from '@gateway/elasticsearch';
import { appRoutes } from '@gateway/routes';
import { axiosAuthInstance } from '@gateway/services/api/auth.service';

const SERVER_PORT = 4000;
const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'apiGatewayServer', 'debug');

export class GatewayServer {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public start(): void {
    this.securityMiddleware(this.app);
    this.standardMiddleware(this.app);
    this.routesMiddleware(this.app);
    this.startElasticSearch();
    this.errorHandler(this.app);
    this.startServer(this.app);
  }

  private securityMiddleware(app: Application) {
    // TODO: Add security middleware
    app.set('trust proxy', 1);
    app.use(
      cookieSession({
        name: 'jobman-session',
        keys: [`${config.SECRET_KEY_ONE}`, `${config.SECRET_KEY_TWO}`],
        maxAge: 24 * 7 * 3600000,
        secure: config.NODE_ENV !== 'development'
        // sameSite: none
      })
    );
    app.use(hpp());
    app.use(helmet());
    app.use(
      cors({
        origin: config.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      })
    );

    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.session?.jwt) {
        axiosAuthInstance.defaults.headers['Authorization'] = `Bearer ${req.session?.jwt}`;
        // axiosBuyerInstance.defaults.headers['Authorization'] = `Bearer ${req.session?.jwt}`;
        // axiosSellerInstance.defaults.headers['Authorization'] = `Bearer ${req.session?.jwt}`;
        // axiosGigInstance.defaults.headers['Authorization'] = `Bearer ${req.session?.jwt}`;
        // axiosMessageInstance.defaults.headers['Authorization'] = `Bearer ${req.session?.jwt}`;
        // axiosOrderInstance.defaults.headers['Authorization'] = `Bearer ${req.session?.jwt}`;
        // axiosReviewInstance.defaults.headers['Authorization'] = `Bearer ${req.session?.jwt}`;
      }
      next();
    });
  }

  private standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(json({ limit: '200mb' }));
    app.use(urlencoded({ extended: true, limit: '200mb' }));
  }

  private startElasticSearch(): void {
    elasticSearch.checkConnection();
  }

  private routesMiddleware(app: Application): void {
    appRoutes(app);
  }

  private errorHandler(app: Application): void {
    app.use(/('*')/, (req: Request, res: Response, next: NextFunction) => {
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      log.log('error', `${fullUrl} endpoint does not exist.`, '');
      res.status(StatusCodes.NOT_FOUND).json({ message: 'The endpoint called does not exist.' });
      next();
    });

    app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
      if (error instanceof CustomError) {
        log.log('error', `GatewayService ${error.comingFrom}:`, error);
        res.status(error.statusCode).json(error.serializeErrors());
      }

      next();
    });
  }

  private async startServer(app: Application): Promise<void> {
    try {
      const httpServer: http.Server = new http.Server(app);
      this.startHttpServer(httpServer);
    } catch (error) {
      log.log('error', 'GatewayService startServer() method:', error);
    }
  }

  private async startHttpServer(httpServer: http.Server): Promise<void> {
    try {
      log.info(`Worker with process id of ${process.pid} on gateway server has started...`);
      httpServer.listen(SERVER_PORT, () => {
        log.info(`Gateway server running on port ${SERVER_PORT}`);
      });
    } catch (error) {
      log.log('error', 'GatewayService startServer() method:', error);
    }
  }
}
