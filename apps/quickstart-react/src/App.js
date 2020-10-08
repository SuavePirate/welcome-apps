import React from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

class App extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      settings: {},
      context: {},
      board: {},
      currentGroup: {},
      currentItem: {},
      me: {},
      newItemText: ""
    };
  }

  componentDidMount() {
    // TODO: set up event listeners
    monday.listen("settings", (res) => {
      console.log(res)
      this.setState({
        ...this.state,
        settings: res.data
      });
    });
    monday.listen("context", res => {
      console.log(res.data);
      // do Something
      this.setState({
        ...this.state,
        context: res.data
      })
      console.log(this.state.context.boardIds[0])
      monday.api(`query { boards(ids: ${this.state.context.boardIds[0]}) { 
        name, 
        groups {
            id
            title,
            items {
              id
              name,
            }
          } 
        } }`).then((res) => {
        console.log(res)
        this.setState({
          ...this.state,
          board: res.data.boards[0],
          currentGroup: res.data.boards[0].groups[0]
        });
      });
    })

    monday.api(`query { me { id, name } }`).then((res) => {
      this.setState({
        ...this.state,
        me: res.data.me
      });
    });

  }
  updateItem(itemId) {
    monday.api(`query {
       items(ids:${itemId}) {
           id
           name
           column_values {
             id
             title
             text
             value
             type
           }
         }
    }`).then(res => {
      this.setState({
        ...this.state,
        currentItem: res.data.items[0]
      })
    })
  }
  handleSubmit(e) {
    e.preventDefault();
    // NOTE: board and group id are hard coded to test
    monday.api(`mutation {
      create_item (
      board_id: ${this.state.context.boardIds[0]},
      group_id: ${this.state.currentGroup.id},
      item_name: "${this.state.newItemText}"
      ) { id
          name
      }
  }`).then((res) => {
      console.log(res)
      this.setState({
        ...this.state,
        newItemText: ''
      });
      this.updateItem(res.data.create_item.id)
    })
  }
  handleNewItemChange(e) {
    this.setState({
      ...this.state,
      newItemText: e.target.value
    })
  }
  handleGroupChange(group) {
    this.setState({
      ...this.state,
      currentGroup: group
    })
  }
  upvote() {
    const upvotersValue = this.state.currentItem.column_values.find(c => c.id === "people")
    console.log(upvotersValue);
    console.log(this.state.me)
    const upvoters = upvotersValue.personsAndTeams ? upvotersValue.personsAndTeams : [];
    if(upvoters.some(p => p.id === this.state.me.id)) {
      console.log('ya already upvoted ya dingus');
      return;
    }

    upvoters.push({
      id: this.state.me.id,
      kind: "person"
    });

    var json = JSON.stringify(upvoters);
    json = json.replace(/"/g, '\\"')
    
    monday.api(`
    mutation {
      change_column_value(item_id: ${this.state.currentItem.id}, board_id: ${this.state.context.boardIds[0]}, column_id: "people", value: "{\\"personsAndTeams\\": ${json}, \\"changed_at\\":\\"2020-10-08T00:30:24.345Z\\"}") {
        id
      }
    }`)
  }
  render() {
    return (
      <div
        className="App"
        style={{ background: this.state.settings.background }}>
        <h1>Hello, {this.state.me.name}!</h1>
        <br />
        <p>Add an item to {this.state.board.name}</p>
        <br />
        <p>Choose a group to add the item to</p>
        <ul>
          {this.state.board.groups && this.state.board.groups.map((g, i) => (
            <li onClick={() => this.handleGroupChange(g)} key={i}>
              <p>{g.title}</p>
              {g.id === this.state.currentGroup.id && <p>Selected!</p>}
            </li>
          ))}
        </ul>

        <form onSubmit={this.handleSubmit.bind(this)}>
          <input value={this.state.newItemText} placeholder="New item thing" onChange={this.handleNewItemChange.bind(this)} />
          <button type="submit">Submit new item</button>
        </form>

        <p>Choose an item</p>
        <ul>
          {this.state.currentGroup && this.state.currentGroup.items && this.state.currentGroup.items.map((item, i) => (
            <li onClick={() => this.updateItem(item.id)} key={i}>
              <p>{item.name}</p>
              {this.state.currentItem && item.id === this.state.currentItem.id && <p>Selected!</p>}
            </li>
          ))}
        </ul>

        {this.state.currentItem && <div>
          <p>Vote!</p>
          <button onClick={() => this.upvote()}>Upvote</button>
          <button >Downvote</button>
        </div>}
      </div>
    );
  }
}

export default App;
