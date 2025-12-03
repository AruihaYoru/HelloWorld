/**
 * @file jp.co.example.framework.helloworld.v1_0_0.js
 * @version 1.0.0 
 * @author 或いは夜
 *
 * @description
 * 「Hello World」メッセージ表示機能を提供するための、極めて堅牢かつ防御的な設計思想に基づくフレームワークの初版。
 * 本フレームワークは、いかなる実行環境においても予測可能かつ安定した動作を提供することを最優先目標としています。
 * そのため、潜在的なランタイムエラー、意図しない状態遷移、および環境差異に起因する問題を徹底的に排除する機構を組み込んでいます。
 *
 * ■ 設計原則:
 * 1.  フェイルファスト (Fail-fast):
 *     問題が発生した場合、可能な限り早期に、かつ明確な形で検出し、システムのサイレントな異常状態を防ぎます。
 * 2.  契約による設計 (Design by Contract):
 *     各モジュール（クラス、関数）は、その責務、事前条件、事後条件を明確に定義し、契約に違反する利用を防止します。
 * 3.  不変性 (Immutability):
 *     一度作成されたオブジェクトや状態は原則として変更不可能とし、副作用を最小限に抑え、システムの予測可能性を最大化します。
 * 4.  追跡可能性 (Traceability):
 *     すべての非同期操作やビジネスプロセスは、一意な相関IDによって追跡可能であり、デバッグと監査を容易にします。
 *
 * @warning
 * 本コードにおける頻繁な改行は、意図的なコーディングスタイルです。
 * 一行一責務の原則を徹底することで、コードレビュー時の認知負荷を低減し、各行の意図を明確にすることを目的としています。
 */

// --- グローバルスコープ隔離境界 (Global Scope Isolation Boundary) ---
// フレームワーク全体を即時実行関数でラップします。
// これにより、グローバル名前空間への意図しない変数定義や汚染を完全に防止し、
// 他のスクリプトとのコンフリクトリスクを排除します。
// 依存するグローバルオブジェクトは、引数として明示的に注入し、依存関係をコード上で明確にします。
((
    global,
    document,
    performance,
    console,
    Object,
    Promise,
    setTimeout,
    clearTimeout,
    Map,
    Set,
    JSON,
    Worker,
    Blob,
    URL
) => {

    'use strict';

    // ===================================================================================
    // --- セクション 0: 定数、列挙型、および表明 (Constants, Enums, and Assertions) ---
    // フレームワーク全体で使用される設定値や識別子を一元管理し、マジックナンバーやマジックストリングを排除します。
    // また、開発段階での品質を保証するための表明（アサーション）ユーティリティを定義します。
    // ===================================================================================

    const Constants = Object.freeze({
        // ログレベル定義。数値が小さいほど詳細なログを示します。
        LOG_LEVELS: Object.freeze({
            DEBUG: 0, // 開発者向けの詳細なデバッグ情報
            INFO: 1,  // システムの正常な動作を示す情報
            WARN: 2,  // 潜在的な問題を示す警告
            ERROR: 3, // 処理の続行が困難なエラー
            NONE: 4   // 全てのログを抑制
        }),
        // 運用環境に応じて変更されるべき、デフォルトのログレベル。
        DEFAULT_LOG_LEVEL: 'INFO',
        // 非同期処理のリトライ（再試行）に関する設定値。
        RETRY_BASE_DELAY_MS: 200, // 初回リトライ時の待機時間（ミリ秒）
        MAX_RETRY_ATTEMPTS: 3,    // 最大リトライ回数
        // DOM要素のフェードインアニメーションの時間（ミリ秒）。
        DOM_FADE_IN_MS: 2000,
        // DOMに描画する際のルートコンテナ要素のID。
        DOM_ROOT_ELEMENT_ID: 'hyper-defensive-root-container-v1',
        // イベント種別を定義する列挙型。文字列リテラルの直接使用を避けることで、タイプミスによるバグを防止します。
        EVENT_TYPES: Object.freeze({
            CONSTRUCTION_STARTED: 'CONSTRUCTION_STARTED', // 構築プロセス開始イベント
            PART_ACQUIRED: 'PART_ACQUIRED',               // 文字列パーツ取得完了イベント
            CONSTRUCTION_FINALIZED: 'CONSTRUCTION_FINALIZED', // 構築プロセス完了イベント
            UI_STATE_READY_TO_RENDER: 'UI_STATE_READY_TO_RENDER', // UI描画準備完了イベント
        }),
        // コマンド種別を定義する列挙型。
        COMMAND_TYPES: Object.freeze({
            ACQUIRE_PART: 'ACQUIRE_PART', // 文字列パーツ取得コマンド
        }),
        // 有限状態機械(FSM)の状態を定義する列挙型。
        FSM_STATES: Object.freeze({
            IDLE: 'IDLE',                         // 初期状態
            AWAITING_PART_1: 'AWAITING_PART_1',   // 第1パーツ待機状態
            AWAITING_PART_2: 'AWAITING_PART_2',   // 第2パーツ待機状態
            FINALIZED: 'FINALIZED',               // 完了状態
        }),
        // 有限状態機械(FSM)のアクション（状態遷移のトリガー）を定義する列挙型。
        FSM_ACTIONS: Object.freeze({
            START: 'START',     // プロセス開始アクション
            ACQUIRE: 'ACQUIRE', // パーツ取得アクション
            FINALIZE: 'FINALIZE', // 完了アクション
        }),
    });

    /**
     * @class Assert
     * @description 「契約による設計 (Design by Contract)」を支援するための表明ユーティリティクラス。
     * 関数の事前条件（引数の型や値など）を検証するために使用します。
     * これらのチェックは開発段階でのみ有効であり、本番ビルド時には無効化（または削除）されることを想定しています。
     */
    const Assert = Object.freeze({
        isString: (value, message) => {
            if (typeof value !== 'string') {
                throw new Error(message || '表明違反: 値が文字列ではありません。');
            }
        },
        isObject: (value, message) => {
            if (typeof value !== 'object' || value === null) {
                throw new Error(message || '表明違反: 値がオブジェクトではありません。');
            }
        },
        isFunction: (value, message) => {
            if (typeof value !== 'function') {
                throw new Error(message || '表明違反: 値が関数ではありません。');
            }
        },
        isNotNull: (value, message) => {
            if (value === null || typeof value === 'undefined') {
                throw new Error(message || '表明違反: 値がnullまたはundefinedです。');
            }
        },
    });

    // ===================================================================================
    // --- セクション 1: コアインフラストラクチャサービス (Core Infrastructure Services) ---
    // アプリケーションのドメインロジックとは独立した、横断的な機能を提供する基盤サービス群。
    // ===================================================================================

    /**
     * @class Logger
     * @description タイムスタンプ付きのログ出力機能を提供します。
     * consoleオブジェクトを直接使用せず、このクラスを介することで、将来的なログ出力先の変更
     * (例: 外部のログ収集サービスへの転送) にも柔軟に対応できます。
     */
    class Logger {
        constructor() {
            this.logLevel = Constants.LOG_LEVELS[Constants.DEFAULT_LOG_LEVEL];
        }

        _log(level, context, message, ...args) {
            // 設定されたログレベルに満たないログは、パフォーマンスへの影響を避けるため出力しない。
            if (Constants.LOG_LEVELS[level] < this.logLevel) {
                return;
            }

            const timestamp = new Date().toISOString();
            const logFunction = level === 'ERROR' ? console.error : console.log;

            // ログの可読性を高めるため、タイムスタンプ、レベル、コンテキスト(発生源)を付与する。
            logFunction(`[${timestamp}] [${level}] [${context}]`, message, ...args);
        }

        debug(context, message, ...args) { this._log('DEBUG', context, message, ...args); }
        info(context, message, ...args) { this._log('INFO', context, message, ...args); }
        error(context, message, ...args) { this._log('ERROR', context, message, ...args); }
    }

    /**
     * @class Kernel (DIコンテナ)
     * @description 依存性の注入(Dependency Injection)パターンを実装するコンテナ。
     * 各コンポーネントが必要とする依存オブジェクトを自動的に生成・注入することで、
     * コンポーネント間の疎結合を実現し、単体テストの容易性を向上させます。
     */
    class Kernel {
        constructor(logger) {
            Assert.isObject(logger, 'LoggerオブジェクトがKernelに提供されていません。');
            this.logger = logger;
            this.definitions = new Map();
            this.instances = new Map();
            this.isSealed = false; // 起動後の意図しないサービス登録を防ぐためのフラグ
        }

        /**
         * サービス（コンポーネント）の定義をコンテナに登録します。
         * @param {string} name - サービスの一意な名前
         * @param {Function} definition - サービスのコンストラクタ関数
         * @param {string[]} [dependencies=[]] - 依存するサービス名の配列
         */
        register(name, definition, dependencies = []) {
            Assert.isString(name, 'サービス名は文字列である必要があります。');
            Assert.isFunction(definition, 'サービス定義はコンストラクタ関数である必要があります。');

            if (this.isSealed) {
                this.logger.error('Kernel', `カーネル封印後に "${name}" を登録しようとしました。`);
                return;
            }
            this.definitions.set(name, { definition, dependencies });
        }

        /**
         * 登録されたサービス名のインスタンスを取得します。
         * インスタンスはシングルトンとして管理され、初回アクセス時に生成されます（遅延初期化）。
         * @param {string} name - 取得したいサービスの名前
         * @returns {object} サービスのインスタンス
         */
        get(name) {
            Assert.isString(name, 'サービス名は文字列である必要があります。');

            if (this.instances.has(name)) {
                return this.instances.get(name);
            }

            const serviceDef = this.definitions.get(name);
            if (!serviceDef) {
                throw new Error(`[Kernel] サービスが見つかりません: ${name}`);
            }

            this.logger.debug('Kernel', `サービスをインスタンス化しています: ${name}`);

            // 依存関係を再帰的に解決
            const resolvedDependencies = serviceDef.dependencies.map(dep => this.get(dep));
            const instance = new serviceDef.definition(...resolvedDependencies);

            this.instances.set(name, instance);
            return instance;
        }

        /**
         * カーネルを封印し、以降のサービス登録を禁止します。
         * これにより、アプリケーション起動後の構成の不変性を保証します。
         */
        seal() {
            this.isSealed = true;
            this.logger.info('Kernel', 'カーネルは封印されました。これ以上のサービス登録は許可されません。');
        }
    }

    /**
     * @class MessageBus
     * @description CQRS (コマンドクエリ責務分離) パターンをサポートする非同期メッセージング基盤。
     * コマンド（操作の意図）とイベント（発生した事実）の伝達を仲介します。
     */
    class MessageBus {
        constructor(logger) {
            this.logger = logger;
            this.commandHandlers = new Map();
            this.eventListeners = new Map();
        }

        registerCommandHandler(commandType, handler) {
            if (this.commandHandlers.has(commandType)) {
                throw new Error(`[MessageBus] コマンドハンドラが重複して登録されました: ${commandType}`);
            }
            this.commandHandlers.set(commandType, handler);
        }

        registerEventListener(eventType, listener) {
            if (!this.eventListeners.has(eventType)) {
                this.eventListeners.set(eventType, new Set());
            }
            this.eventListeners.get(eventType).add(listener);
        }

        async dispatch(command) {
            const handler = this.commandHandlers.get(command.type);
            if (handler) {
                return handler(command);
            }
            this.logger.info('MessageBus', `コマンドに対するハンドラが見つかりません: ${command.type}`);
        }

        publish(event) {
            // setTimeout(..., 0) を使用することで、現在の実行スタックが完了した後に
            // イベント処理を行い、イベント発行元と処理を時間的に分離します。
            setTimeout(() => {
                const listeners = this.eventListeners.get(event.type);
                if (listeners) {
                    listeners.forEach(listener => {
                        try {
                            listener(event);
                        } catch (e) {
                            this.logger.error('MessageBus', `イベントリスナーで例外が発生しました (${event.type})`, e);
                        }
                    });
                }
            }, 0);
        }
    }

    /**
     * @class UUIDGenerator
     * @description 一意な識別子 (UUID v4 互換) を生成します。
     * 各ビジネスプロセスや操作にユニークなIDを付与し、ログやイベントの追跡を容易にします。
     */
    class UUIDGenerator {
        generate() {
            // RFC 4122準拠ではありませんが、本フレームワーク内での一意性は担保されます。
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    // ===================================================================================
    // --- セクション 2: ドメイン層 (Domain Layer) ---
    // アプリケーションのコアとなるビジネスロジックとルールを定義する層。
    // ===================================================================================

    /**
     * @const FSM
     * @description 有限状態機械(Finite State Machine)。
     * メッセージ構築プロセスの状態と、許可される遷移を厳密に定義します。
     * これにより、不正な順序での操作を防ぎ、プロセスの健全性を保証します。
     */
    const FSM = Object.freeze({
        states: Constants.FSM_STATES,
        transitions: Object.freeze({
            [Constants.FSM_STATES.IDLE]:            { [Constants.FSM_ACTIONS.START]: Constants.FSM_STATES.AWAITING_PART_1 },
            [Constants.FSM_STATES.AWAITING_PART_1]: { [Constants.FSM_ACTIONS.ACQUIRE]: Constants.FSM_STATES.AWAITING_PART_2 },
            [Constants.FSM_STATES.AWAITING_PART_2]: { [Constants.FSM_ACTIONS.ACQUIRE]: Constants.FSM_STATES.FINALIZED },
        }),
        transition(currentState, action) {
            const nextState = this.transitions[currentState]?.[action];
            if (!nextState) {
                throw new Error(`[FSM] 不正な状態遷移です: 現状態(${currentState}) -> アクション(${action})`);
            }
            return nextState;
        }
    });

    /**
     * @class MessageAggregate
     * @description ドメイン駆動設計(DDD)における「集約」です。
     * メッセージ構築というビジネスプロセスに関連する状態(parts)と振る舞い(メソッド)をカプセル化し、
     * データの一貫性を保ちます。状態はイベントソーシングの考え方に基づき、イベントとして記録されます。
     */
    class MessageAggregate {
        constructor(context, messageBus) {
            this.context = context; // 操作の追跡用コンテキスト
            this.messageBus = messageBus;
            this.parts = [];
            this.uncommittedEvents = []; // 保存されていないイベントのキュー
            this.state = FSM.states.IDLE;
        }

        startConstruction() {
            this.state = FSM.transition(this.state, Constants.FSM_ACTIONS.START);
            this._raiseEvent(Constants.EVENT_TYPES.CONSTRUCTION_STARTED, {});
        }

        acquirePart(part) {
            this.state = FSM.transition(this.state, Constants.FSM_ACTIONS.ACQUIRE);
            this.parts.push(part);
            this._raiseEvent(Constants.EVENT_TYPES.PART_ACQUIRED, { part });
            
            if (this.state === FSM.states.FINALIZED) {
                this._raiseEvent(Constants.EVENT_TYPES.CONSTRUCTION_FINALIZED, { finalMessage: this.parts.join(' ') });
            }
        }

        _raiseEvent(type, payload) {
            const event = { type, payload, context: this.context };
            this.uncommittedEvents.push(event);
        }

        commit() {
            this.uncommittedEvents.forEach(event => this.messageBus.publish(event));
            this.uncommittedEvents = [];
        }
    }

    /**
     * @class AggregateRepository
     * @description リポジトリパターン。ドメインオブジェクト（集約）の永続化と再構築を抽象化します。
     * これにより、ドメイン層は具体的なデータ保存方法（DB、ファイル等）を知る必要がなくなります。
     * ※本実装では、簡略化のためインメモリのMapを永続化ストアとして使用します。
     */
    class AggregateRepository {
        constructor(logger, messageBus) {
            this.logger = logger;
            this.messageBus = messageBus;
            this.store = new Map(); // インメモリの永続化ストア
        }

        async create(context) {
            const aggregate = new MessageAggregate(context, this.messageBus);
            aggregate.startConstruction();
            await this.save(aggregate);
            this.logger.info('Repository', `新規集約を作成しました。相関ID: ${context.correlationId}`);
            return aggregate;
        }

        async findById(context) {
            // 本来のイベントソーシングでは、IDに関連する全イベントを取得し、
            // それらを再生して集約の最新状態を復元します。
            // ここではインスタンスを直接取得します。
            return this.store.get(context.correlationId);
        }

        async save(aggregate) {
            this.store.set(aggregate.context.correlationId, aggregate);
            // 保存が成功した後に、キューイングされたイベントをバスに発行します。
            aggregate.commit();
        }
    }

    // ===================================================================================
    // --- セクション 3: アプリケーション層 & ワーカー層 (Application & Worker Layer) ---
    // ユースケースを実現し、重い処理を別スレッドにオフロードする層。
    // ===================================================================================
    
    /**
     * @class WorkerGateway
     * @description Web Workerとの通信を抽象化するゲートウェイ。
     * メインスレッド（UIスレッド）をブロックする可能性のある処理を別スレッドに委譲し、
     * アプリケーションの応答性を維持します。
     */
    class WorkerGateway {
        constructor(logger, uuidGenerator) {
            this.logger = logger;
            this.uuidGenerator = uuidGenerator;
            this.worker = null;
            this.inflightRequests = new Map(); // 処理中のリクエストを管理
        }

        initialize() {
            // Workerのスクリプトを動的に生成します。これにより外部ファイルへの依存をなくします。
            const workerCode = `self.onmessage = ({ data }) => { self.postMessage(data); };`;
            try {
                const blob = new Blob([workerCode], {type: 'application/javascript'});
                this.worker = new Worker(URL.createObjectURL(blob));
                this.worker.onmessage = (e) => this._handleMessage(e);
                this.logger.info('WorkerGateway', 'Web Workerは正常に初期化されました。');
            } catch (e) {
                this.logger.error('WorkerGateway', 'Web Workerの初期化に失敗しました。フォールバック処理に移行します。', e);
            }
        }
        
        _handleMessage({ data: { id, result } }) {
            if (this.inflightRequests.has(id)) {
                this.inflightRequests.get(id).resolve(result);
                this.inflightRequests.delete(id);
            }
        }

        async process(payload) {
            // Workerが利用できない場合は、メインスレッドで非同期に処理を実行するフォールバック。
            if (!this.worker) return payload; 

            const id = this.uuidGenerator.generate();
            return new Promise((resolve) => {
                this.inflightRequests.set(id, { resolve });
                this.worker.postMessage({ id, result: payload });
            });
        }
        
        terminate() {
            if (this.worker) {
                this.worker.terminate();
                this.logger.info('WorkerGateway', 'Web Workerは正常に終了されました。');
            }
        }
    }
    
    /**
     * @class PartAcquisitionService
     * @description アプリケーションサービス。文字列パーツの取得というユースケースを担当します。
     * ドメインオブジェクトの操作や、外部サービス（ここではWorkerGateway）との連携を調整します。
     */
    class PartAcquisitionService {
        constructor(logger, messageBus, repository, gateway) {
            this.logger = logger;
            this.messageBus = messageBus;
            this.repository = repository;
            this.gateway = gateway;
            this.messageBus.registerCommandHandler(Constants.COMMAND_TYPES.ACQUIRE_PART, cmd => this.handle(cmd));
        }

        async handle(command) {
            const { context, partToAcquire } = command.payload;
            try {
                const acquiredPart = await this._retryableOperation(() => this.gateway.process(partToAcquire));
                const aggregate = await this.repository.findById(context);
                if (aggregate) {
                    aggregate.acquirePart(acquiredPart);
                    await this.repository.save(aggregate);
                }
            } catch (e) {
                this.logger.error('PartAcquisitionService', `パーツ "${partToAcquire}" の取得に失敗しました。`, e);
            }
        }
        
        // 一時的な障害（ネットワークなど）からの自己回復を試みるリトライ機構。
        async _retryableOperation(operation) {
            for (let i = 0; i < Constants.MAX_RETRY_ATTEMPTS; i++) {
                try {
                    return await operation();
                } catch (error) {
                    if (i === Constants.MAX_RETRY_ATTEMPTS - 1) {
                        throw error;
                    }
                    const delay = Constants.RETRY_BASE_DELAY_MS * (2 ** i); // 指数バックオフ
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }
    }
    
    /**
     * @class ProcessSaga
     * @description サーガパターン。複数の非同期ステップにまたがるビジネスプロセスを管理します。
     * イベントを購読し、それに応じて次のコマンドを発行することで、プロセスを進行させます。
     */
    class ProcessSaga {
        constructor(logger, messageBus, uuidGenerator) {
            this.logger = logger;
            this.messageBus = messageBus;
            this.uuidGenerator = uuidGenerator;
            messageBus.registerEventListener(Constants.EVENT_TYPES.CONSTRUCTION_STARTED, e => this._onStarted(e));
            messageBus.registerEventListener(Constants.EVENT_TYPES.PART_ACQUIRED, e => this._onPartAcquired(e));
        }

        _onStarted(event) {
            this._dispatchAcquirePart(event.context, 'Hello');
        }

        _onPartAcquired(event) {
            if (event.payload.part === 'Hello') {
                this._dispatchAcquirePart(event.context, 'World');
            }
        }
        
        _dispatchAcquirePart(context, partToAcquire) {
            this.messageBus.dispatch({
                type: Constants.COMMAND_TYPES.ACQUIRE_PART,
                payload: { context, partToAcquire }
            });
        }
    }
    
    // ===================================================================================
    // --- セクション 4: プレゼンテーション層 (Presentation Layer) ---
    // ユーザーインターフェースへの描画に関する責務を担う層。
    // ===================================================================================
    
    /**
     * @class UIProjection
     * @description プロジェクション。CQRSにおけるリードモデルを生成します。
     * ドメインイベントを購読し、UI表示に最適化された単純なデータ構造（ビューモデル）に変換します。
     */
    class UIProjection {
        constructor(messageBus) {
            messageBus.registerEventListener(Constants.EVENT_TYPES.CONSTRUCTION_FINALIZED, e => {
                messageBus.publish({
                    type: Constants.EVENT_TYPES.UI_STATE_READY_TO_RENDER,
                    payload: { finalMessage: e.payload.finalMessage }
                });
            });
        }
    }
    
    /**
     * @class DOMRenderer
     * @description UIの状態（ビューモデル）を実際のDOMに描画する責務を持ちます。
     * このクラスのみがDOM APIに直接アクセスすることを許可されます。
     */
    class DOMRenderer {
        constructor(logger, messageBus) {
            this.logger = logger;
            this.container = null;
            messageBus.registerEventListener(Constants.EVENT_TYPES.UI_STATE_READY_TO_RENDER, e => this.render(e.payload));
        }
        
        render(model) {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = Constants.DOM_ROOT_ELEMENT_ID;
                Object.assign(this.container.style, {
                    width: '100vw',
					height: '100vh',
					margin: '0',
					display: 'flex',
                    alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#000',
                    color: '#39FF14',
					fontFamily: 'monospace', 
					fontSize: '5vw',
                    opacity: 1
                });
                document.body.appendChild(this.container);
            }
			
			this.container.textContent = model.finalMessage;
        }
    }

    // ===================================================================================
    // --- セクション 5: プラットフォーム起動とライフサイクル管理 (Bootstrap & Lifecycle) ---
    // ===================================================================================
    
    /**
     * @class Platform
     * @description アプリケーション全体の起動シーケンスとライフサイクルを管理するメインクラス。
     */
    class Platform {
        constructor() {
            this.kernel = null;
            this.logger = null;
        }
        
        _initializeServices() {
            this.logger = new Logger();
            this.kernel = new Kernel(this.logger);
            
			this.kernel.register('Logger', Logger, []);
            this.kernel.register('MessageBus', MessageBus, ['Logger']);
            this.kernel.register('UUIDGenerator', UUIDGenerator, []);
            this.kernel.register('AggregateRepository', AggregateRepository, ['Logger', 'MessageBus']);
            this.kernel.register('WorkerGateway', WorkerGateway, ['Logger', 'UUIDGenerator']);
            this.kernel.register('PartAcquisitionService', PartAcquisitionService, ['Logger', 'MessageBus', 'AggregateRepository', 'WorkerGateway']);
            this.kernel.register('ProcessSaga', ProcessSaga, ['Logger', 'MessageBus', 'UUIDGenerator']);
            this.kernel.register('UIProjection', UIProjection, ['MessageBus']);
            this.kernel.register('DOMRenderer', DOMRenderer, ['Logger', 'MessageBus']);
        }
        
        _instantiateServices() {
            // DIコンテナから主要なサービスを取得することで、依存関係ツリー全体がインスタンス化される。
            this.kernel.get('DOMRenderer');
            this.kernel.get('PartAcquisitionService');
            this.kernel.get('ProcessSaga');
            this.kernel.get('UIProjection');
        }

        startup() {
            try {
                // 最初にサービスを初期化し、this.loggerを生成します。
                this._initializeServices();
            
                // this.loggerが利用可能になったので、ログを出力します。
                this.logger.info('Platform', 'プラットフォームを起動します...');
            
                // 残りの起動処理を続行します。
                this._instantiateServices();
                this.kernel.get('WorkerGateway').initialize();
                this.kernel.seal();
            
                // 最初のビジネスプロセスを開始する。
                const repo = this.kernel.get('AggregateRepository');
                const uuid = this.kernel.get('UUIDGenerator');
                const initialContext = { correlationId: uuid.generate() };
                repo.create(initialContext);
			
            } catch (error) {
                // _initializeServices()で失敗した場合、this.loggerは未定義の可能性があります。
                // そのため、元の実装通りconsole.errorを使用するのが最も安全です。
                console.error('[Platform] 起動中に回復不能なエラーが発生しました。', error);
                document.body.innerHTML = '<div>A critical error occurred during platform initialization.</div>';
            }
        }
        
        shutdown() {
            this.logger.info('Platform', 'シャットダウンシーケンスを開始します...');
            const gateway = this.kernel.get('WorkerGateway');
            if (gateway) {
                // 生成したWorkerなどのリソースを確実に解放する。
                gateway.terminate();
            }
            this.logger.info('Platform', 'シャットダウンが完了しました。');
        }
    }
    
    // --- エントリーポイント (Entry Point) ---
    // DOMツリーの構築が完了したことを確認してから、プラットフォームを起動する。
    // これにより、DOM要素へのアクセスが安全に行えることを保証する。
    document.addEventListener('DOMContentLoaded', () => {
        const platform = new Platform();
        platform.startup();
        
        // ページが閉じられる際に、クリーンアップ処理を実行する。
        window.addEventListener('beforeunload', () => platform.shutdown());
    });

})(
    window,
    document,
    performance,
    console,
    Object,
    Promise,
    setTimeout,
    clearTimeout,
    Map,
    Set,
    JSON,
    window.Worker,
    window.Blob,
    window.URL
);