<div class="row">
	<div class="col-sm-2 col-xs-12 settings-header">Twitter SSO</div>
	<div class="col-sm-10 col-xs-12">
		<div class="alert alert-info">
			<ol>
				<li>
					Create a <strong>Twitter Application</strong> via the
					<a href="https://apps.twitter.com/">Twitter Developers Page</a> and then
					paste your application details here.
				</li>
				<li>Use http://your.domain/auth/twitter/callback as the callback URL.</li>
			</ol>
		</div>
		<form role="form" class="sso-twitter-settings">
			<div class="form-group">
				<label for="key">API Key</label>
				<input type="text" name="key" id="key" title="API Key" class="form-control" placeholder="API Key">
			</div>
			<div class="form-group">
				<label for="secret">API Secret</label>
				<input type="text" name="secret" id="secret" title="API Secret" class="form-control" placeholder="API Secret">
			</div>
		</form>
	</div>
</div>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>