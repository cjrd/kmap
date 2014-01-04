kmap
====

Knowledge map visualization library


## Demo
The knowledge map library is the core component for Metacademy's interactive knowledge map, e.g. [metacademy graph demo](http://metacademy.org/graphs/concepts/bayesian_linear_regression#focus=bayesian_linear_regression&mode=explore)

## Installation

1. Clone this repository

        git clone https://github.com/cjrd/kmap.git
        
1. Run a local server, e.g.

        python -m SimpleHTTPServer
        
1. Run the tests by navigating to `http://localhost:8000/tests.html`

1. See a simple demo at `http://localhost:8000/dev.html`


## Data format

Coming soon (send me an email if you need this right now)

## Data Format

TODO fully document the data format

The minimal expected data format is as follows (only id is required):

        [node1, node2, ...]
        
        nodeX = 
        {
                id: "node_id" // this is the only required attribute for nodes
                title: "display title for node"
                summary: "summary of node"
                dependencies: [dep1, dep2, ...]    
        }
       
        depX =   
        {
                source: "source_id", // this is the only require attribute for deps
                reason: "reason for dep"
        }


## Notes
The knowledge map visualization library is a work in progress -- it was extracted from the [metacademy application codebase](https://github.com/metacademy/metacademy-application). I am currently working on making this code easy to use by itself while still maintaining compatability with metacademy. Please contact me (coloradoNospam at berkeley dot edu, remove the no spam part) if you want to use this code for your own project but are having trouble figuring out the code.
