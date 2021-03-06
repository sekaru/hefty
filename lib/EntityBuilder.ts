import { StatesRegistry, StateBuilder } from './State'
import { StateNotFoundError } from './StateNotFoundError'

export class EntityBuilder<T> {
  private states: StatesRegistry<T>
  private builders: StateBuilder<T>[] = []
  private args: string[]
  private Entity: new (...args) => T

  constructor(states: StatesRegistry<T>, defaults: string[], Entity: new (...args) => T, ...args: any[]) {
    this.states = states
    this.args = args
    this.Entity = Entity

    for (let stateName of defaults.filter((state) => !!state)) {
      if (this.states?.[stateName]) {
        this.builders.push(this.states[stateName])
      } else {
        throw new StateNotFoundError(stateName)
      }
    }
  }

  private async build(entities: T[]): Promise<T[]> {
    return await Promise.all(entities.map(async (entity: T, idx: number) => {
      for (let builder of this.builders) {
        Object.assign(entity, await builder(entity, idx, entities))
      }
      return entity
    }))
  }

  private makeEntity(): T {
    return new this.Entity(...this.args)
  }

  state(stateName: string): EntityBuilder<T> {
    if (this.states?.[stateName]) {
      this.builders.push(this.states[stateName])
      return this
    } else {
      throw new StateNotFoundError(stateName)
    }
  }

  with(builder: StateBuilder<T>) {
    this.builders.push(builder)
    return this
  }

  async one(): Promise<T> {
    return (await this.build([this.makeEntity()]))[0]
  }

  async many(count: number): Promise<T[]> {
    return await this.build([...new Array(count)].map(() => this.makeEntity()))
  }
}
