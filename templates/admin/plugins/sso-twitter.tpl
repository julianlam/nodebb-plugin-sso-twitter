<div class="row"
<div class="col-sm-2 col-xs-12 settings-header">Twitter SSO</div>
<div class="col-sm-10 col-xs-12">
	<div class="alert alert-info">
		<ol>
			<liCreate a new App via the
			<a href="https://apps.twitter.com/">Twitter Apps Page</a> and thepaste your application details here. Your
			<em>Callback URL</em> is <code>http://your.domain/auth/twitter/callback</cod(replace
			<code>your.domain</code> as necessary).
			</li>
			<li>
				In the "Keys and Access Tokens" tab, you will find a "Consumer Key" and "Consumer Secret", paste
				these twovalues into the corresponding fields below
			</li>
			<li>Save and restart your NodeBB.</li></ol>
	</div>
	<form role="form" class="sso-twitter-settings">
		<div class="form-group">
			<label for="key">API Key</label>
			<input type="text" name="key" id="key" title="API Key" class="form-control" placeholder="API Key">
		</div>
		<div class="form-group">
			<label for="secret">API Secret</label>
			<input type="text" name="secret" id="secret" title="API Secret" class="form-control"
				   placeholder="API Secret>	</div>	<div class=" checkbox">
			<label for="showSiteTitle" class="mdl-switch mdl-js-switch mdl-js-ripple-effect"><input type="checkbox"
																									class="mdl-switch__input"
																									id="showSiteTitle"
																									name="autoconfirm"/<span
					class="mdl-switch__label">Skip email verification for people who register using SSO?</span></label>
		</div>
	</form>
</div>
</div>

<button id="save"
		class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>
