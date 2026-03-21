AUCTION_DIRECTIONS_TEMPLATE = """\
      <td align="direction in globals.directions:left" width="25%"><b>{direction}</b></td>\n"""

AUCTION_NAMES_TEMPLATE = """\
      <td align="left" width="25%"><i>{name}</i></td>\n"""

AUCTION_TEMPLATE = """\
<br/>
<table align="center" border="0" cellpadding="0" cellspacing="0" style="width: {width}px;padding-left: 30">
  <tbody>
{header}
{auction}  </tbody>
</table>\n"""

CALL_TEMPLATE="""\
      <td align="left" width="25%">{call}</td>\n"""

def format_call(call: str) -> str:
    # convert abbreviation into a displayable html string
    # input: '1C'
    # output: '1 &#9827;</span>'
    for suit, pip in pips.items():
        if len(call) > 1:
            call = call.replace(suit, ' ' + pip)
    return call.replace('P', 'Pass').replace('D', 'Double').replace('R', 'Redouble').replace('N', ' NT')

def format_auction_calls(auction: List[str], dealer: str) -> list:
    # convert list of call  abbreviations into a  list of displayable calls with the first call being West
    # input: ['1C', 'Pass', '2C', 'Pass', '2S', 'Pass', '3 NT', 'Pass', 'Pass', 'Pass'], North dealer
    # output: [' ', '1 &#9827;', 'Pass', '2 &#9827;',
    #     'Pass', '2 &#9824;', 'Pass', '3 NT', 
    #     '(All pass)']
        
    # translate abbreviations to full calls
    call_list = [format_call(call) for call in auction]
    
    # replace three or four final passes with (All pass)
    if len(call_list) > 3:
        if call_list[-3:] == ['Pass', 'Pass', 'Pass']:
            call_list[-3:] = ['(All pass)']
        if call_list[-1] == 'Pass':
            del call_list[-1]
         
    # determine how many empty cells should begin the auction
    new_auction = ([' '] * ((globals.directions.index(dealer)) % 4))
    new_auction.extend(call_list)
    return new_auction

def format_auction_header(deal: dict, include_directions: bool = True) -> str:
    # construct auction heading from list of players (West first)
    # input: each player's name can be found in deal[direction]["PLayer"]

    players = dict([(seat['Direction'], seat.get('Player', '')) for seat in deal['Seats']])
    auction_header = ''
    if include_directions:
        auction_header = '    <tr>\n'
        for direction in globals.directions:
            auction_header += AUCTION_DIRECTIONS_TEMPLATE.format(direction=direction)
        auction_header += '    </tr>\n'
    
    auction_header += '    <tr>\n'
    for direction in globals.directions:
        auction_header += AUCTION_NAMES_TEMPLATE.format(name=players[direction])
    return auction_header + '    </tr>'
    
    
def format_auction(auction: List[str]) -> str:
    # take output of formatAuctionCalls and format it into html table rows
    
    # extend auction to make length a multiple of four
    auction.extend([' '] * (4 - len(auction) % 4))
    
    # build rows
    auction_html = ''
    for i in range(len(auction)):
        if 0 == i % 4:
            auction_html += '    <tr>\n'
        auction_html += CALL_TEMPLATE.format(call=auction[i])
        if 3 == i % 4:
            auction_html += '    </tr>\n'
    return auction_html

def build_auction_table(deal: dict, width: int = 350) -> str:
    header = format_auction_header(deal)
    auction = format_auction((format_auction_calls(deal["Auction"], deal["Dealer"])))
    return AUCTION_TEMPLATE.format(width=width, header=header, auction=auction)
