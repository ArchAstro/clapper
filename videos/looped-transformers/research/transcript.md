# Universal Transformers narration

## 1. Why give a model another pass?

Lea hands a key to Omar. Omar puts it in a drawer. Where is the key? Answering means joining the two facts. Keep that tiny story in mind. It will guide us from the basic idea all the way down to the math.

## 2. Read. Refine. Answer.

The model reads the story, builds an internal representation, refines that representation, and produces an answer. Here, the answer is drawer. A recurrent Transformer reuses a processing step to revise its internal state. It is revising numerical representations, not writing and rereading a visible draft answer.

## 3. Same information. More chances to connect it.

Imagine first identifying the key and the people. Then connecting the handoff. Then connecting the key to its final location. This is an intuition for refinement, not a claim about what a particular model thinks on each pass. Repetition creates an opportunity to combine information; improvement is not guaranteed.

## 4. The Universal Transformer

Now open the model. The original Universal Transformer has an encoder and a decoder. The encoder refines representations of the input. The decoder refines the available output prefix while consulting the encoder; masking hides future output tokens. A projection and softmax produce probabilities, from which we select the next token. Repeat the decoder process to produce the answer.

## 5. Recurrence runs down depth, not along the sentence

There are two different directions here. Across the page are token positions. Down the page are refinement steps. At each depth step, all positions are revised in parallel. The encoder reuses its weights across steps. The decoder does the same with its own weights. Generating output tokens is a separate, autoregressive process.

## 6. Exchange information. Transform it. Repeat.

Follow one revision from start to finish. Add position and depth signals to the current state. Self-attention exchanges information across positions. A transition function then transforms each position. Residual connections and normalization surround these operations. The resulting state becomes the input to the next revision.

## 7. Attention lets each position consult the others

Inside attention, each position produces a query, a key, and a value. Queries and keys produce matching scores. Softmax turns those scores into mixing weights. A weighted sum of values gives each position information from the others. Multiple heads do this in parallel. The result is an updated representation, not an answer word.

## 8. One shared rule acts on new states

The feed-forward version applies a projection, a nonlinear gate, and another projection at each position. The same learned rules are reused, but the incoming values change. Position signals say where a token is; depth signals say which refinement step this is. Shared weights therefore do not imply identical computation results.

## 9. Now run the complete model again

Return to our story. The encoder repeatedly exchanges and transforms information about the key. The decoder consults that refined input while processing the available answer prefix. The prediction layer assigns probabilities to the next token. Selecting drawer completes this illustrative answer. Every inner step supports that outer journey.

## 10. Different positions can use different depths

The paper also includes optional dynamic halting. Different positions can stop updating after different numbers of steps. This is learned control over computation, not a detector that an answer is true. For the training explanation that follows, we will use a fixed number of refinement steps so the gradient paths stay clear.

## 11. Predict → compare → backpropagate → update

How does the model learn useful refinements? During training, it predicts token probabilities, compares the probability assigned to the correct target, and computes a loss. Backpropagation carries loss sensitivity backward through the decoder and encoder. The optimizer uses those gradients to adjust the weights. On the next example, the entire process runs again.

## 12. One block appears at every refinement step

To see the gradient paths, draw each use of a recurrent block separately. These are uses of the same weights, not independent copies. A later state depends on an earlier state, so feedback passes backward through that dependency. Every use also contributes feedback about the shared parameters. Those contributions must be added.

## 13. A tiny nudge explains one gradient

Take one connection. The input is three and the weight is one half, so the output is one point five. The target is one. For half squared error, the output gradient is one half. A weight nudge is amplified by the input, three. Multiply: the weight gradient is one point five.

## 14. A matrix is a bank of input mixers

A matrix is many such connections. Each row combines inputs to produce one output. Our two by two example maps three and one to five and negative two. Then a gradient comes back from the rest of the network. Call that vector g. Now we can compute all the connection gradients.

## 15. The same rule fills a whole gradient matrix

Now give the projection several inputs and outputs. Every weight gradient is its input value times the gradient at its output. An outer product writes all those values at once: g times x transpose. To continue backward to the inputs, sum the contributions through each connection. That gives W transpose times g.

## 16. Two ways to change the output

The calculus says the same thing. A tiny output change is the weight change acting on x, plus W acting on the input change. Dot that with the incoming gradient g. Collect the coefficients of the independent weight and input changes. They are exactly the outer product and the transposed matrix product we just drew.

## 17. Route backward. Add across uses. Update once.

Inside a full block, these local rules combine into a Jacobian: a table of local sensitivities. Its transpose carries the state gradient backward. Add each use's parameter contribution to get the gradient for the shared block. Only then does the optimizer update that one parameter set. Training embeddings and other blocks receive their own gradients too.

## 18. Reuse the rule. Refine the representation.

We started with a story and an answer. In between, the model repeatedly refines internal representations, then decodes a prediction. Training teaches those shared refinement rules through the same chain rule used elsewhere in neural networks. More steps cost computation, and do not guarantee better answers. That is the idea of recurrent depth.
