import PQueue from 'p-queue';

export default class ThrottleQueue {

  /**
   * Creates an instance of ThrottleQueue. If no parameters are provided, then the queue will have no
   * throttling and will process tasks as fast as possible.
   *
   * @param {Object} [options] The options.
   * @param {number} [options.concurrency=Infinity] The maximum number of tasks to process concurrently.
   * Optional, defaults to `Infinity`, meaning no limit on concurrency.
   * @param {number} [options.intervalCap=Infinity] The interval capacity, meaning the maximum number of
   * tasks to process in a given interval. Optional, defaults to `Infinity`, meaning no interval limit.
   * @param {number} [options.interval=0] The interval in milliseconds for the interval capacity.
   * Optional, defaults to `0`, meaning no interval limit.
   */
  constructor({ concurrency = Infinity, intervalCap = Infinity, interval = 0 } = {}) {
    this.queue = new PQueue({ concurrency, intervalCap, interval });
  }

  /**
   * Enqueue a task to be processed by the throttle queue.
   *
   * @param {Object} options The options for the task.
   * @param {Function} options.task The task to be enqueued.
   * @param {number} [options.ttl] The time-to-live for the task in seconds. Optional, if provided,
   * the task will only be processed if it is still valid when dequeued.
   * @param {number} [options.priority=0] The priority of the task. Optional, defaults to 0. Higher
   * priority tasks will be processed before lower priority ones. For example, the value 1 has a
   * higher priority than 0.
   * @returns {Promise<any>} A promise that resolves when the task is processed.
   */
  enqueue({ task, ttl, priority = 0 }) {
    const expireAt = ttl ? Date.now() + ttl * 1_000 : null;
    return this.queue.add(() => {
      if (expireAt && Date.now() > expireAt) {
        return null;
      }
      return task();
    }, { priority });
  }
}
